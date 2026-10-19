// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { ProfileForm } from './ProfileForm'

afterEach(() => {
  vi.unstubAllGlobals()
})

function profileResponse(displayName: string, version: number) {
  return new Response(
    JSON.stringify({ id: 'p1', displayName, version }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

test('keeps an unsaved draft separate from the pending projection', async () => {
  let resolveRequest: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve
        }),
    ),
  )

  const user = userEvent.setup()
  render(
    <ProfileForm profile={{ id: 'p1', displayName: 'Ada', version: 1 }} />,
  )

  const input = screen.getByLabelText('Display name')
  await user.clear(input)
  await user.type(input, 'Grace')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.clear(input)
  await user.type(input, 'Lin')

  expect(input).toHaveValue('Lin')
  expect(screen.getByLabelText('Current profile name')).toHaveTextContent(
    'Grace',
  )

  await act(async () => {
    resolveRequest?.(profileResponse('Grace', 2))
  })
})

test('does not let an older completion disturb a newer successful save', async () => {
  const requests: Array<{
    resolve: (response: Response) => void
    reject: (error: Error) => void
  }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve, reject) => {
          requests.push({ resolve, reject })
        }),
    ),
  )

  const user = userEvent.setup()
  render(
    <ProfileForm profile={{ id: 'p1', displayName: 'Ada', version: 1 }} />,
  )

  const input = screen.getByLabelText('Display name')
  await user.clear(input)
  await user.type(input, 'Grace')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.clear(input)
  await user.type(input, 'Lin')
  await user.click(screen.getByRole('button', { name: 'Save' }))

  await act(async () => {
    requests[1]?.resolve(profileResponse('Lin', 2))
  })
  await act(async () => {
    requests[0]?.resolve(profileResponse('Grace', 3))
  })

  expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Lin')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('ignores an older failure while the newest submitted name is pending', async () => {
  const requests: Array<{
    resolve: (response: Response) => void
    reject: (error: Error) => void
  }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve, reject) => {
          requests.push({ resolve, reject })
        }),
    ),
  )

  const user = userEvent.setup()
  render(
    <ProfileForm profile={{ id: 'p1', displayName: 'Ada', version: 1 }} />,
  )

  const input = screen.getByLabelText('Display name')
  await user.clear(input)
  await user.type(input, 'Grace')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.clear(input)
  await user.type(input, 'Lin')
  await user.click(screen.getByRole('button', { name: 'Save' }))

  await act(async () => {
    requests[0]?.reject(new Error('first request failed'))
  })

  expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Lin')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()

  await act(async () => {
    requests[1]?.resolve(profileResponse('Lin', 2))
  })
})

test('keeps the draft for retry after an HTTP failure', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(profileResponse('Grace', 2)),
  )

  const user = userEvent.setup()
  render(
    <ProfileForm profile={{ id: 'p1', displayName: 'Ada', version: 1 }} />,
  )

  const input = screen.getByLabelText('Display name')
  await user.clear(input)
  await user.type(input, 'Grace')
  await user.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Save failed. Please retry.',
  )
  expect(input).toHaveValue('Grace')
  expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Ada')

  await user.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByLabelText('Current profile name')).toHaveTextContent(
    'Grace',
  )
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
