// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { ProfileForm } from './ProfileForm'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows the new name while a successful save is pending', async () => {
  let resolveRequest: ((response: Response) => void) | undefined
  const response = new Promise<Response>((resolve) => {
    resolveRequest = resolve
  })
  vi.stubGlobal('fetch', vi.fn(() => response))

  const user = userEvent.setup()
  render(
    <ProfileForm profile={{ id: 'p1', displayName: 'Ada', version: 1 }} />,
  )

  await user.clear(screen.getByLabelText('Display name'))
  await user.type(screen.getByLabelText('Display name'), 'Grace')
  await user.click(screen.getByRole('button', { name: 'Save' }))

  expect(screen.getByLabelText('Current profile name')).toHaveTextContent(
    'Grace',
  )

  resolveRequest?.(
    new Response(
      JSON.stringify({ id: 'p1', displayName: 'Grace', version: 2 }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  )
})

test('restores the authoritative name when a successful response has an invalid shape', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ id: 'p1', displayName: 42, version: 'invalid' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    ),
  )

  const user = userEvent.setup()
  render(
    <ProfileForm profile={{ id: 'p1', displayName: 'Ada', version: 1 }} />,
  )

  await user.clear(screen.getByLabelText('Display name'))
  await user.type(screen.getByLabelText('Display name'), 'Grace')
  await user.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Save failed. Please retry.',
  )
  expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Ada')
})

test('rolls back to an older confirmed response when the latest overlapping save fails', async () => {
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

  await user.clear(screen.getByLabelText('Display name'))
  await user.type(screen.getByLabelText('Display name'), 'Grace')
  await user.click(screen.getByRole('button', { name: 'Save' }))
  await user.clear(screen.getByLabelText('Display name'))
  await user.type(screen.getByLabelText('Display name'), 'Lin')
  await user.click(screen.getByRole('button', { name: 'Save' }))

  await act(async () => {
    requests[0]?.resolve(
      new Response(
        JSON.stringify({ id: 'p1', displayName: 'Grace', version: 2 }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
  })
  expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Lin')

  await act(async () => {
    requests[1]?.reject(new Error('network unavailable'))
  })

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Save failed. Please retry.',
  )
  expect(screen.getByLabelText('Current profile name')).toHaveTextContent(
    'Grace',
  )
})
