import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import SearchPage from './SearchPage.vue'

type DeferredResponse = {
  promise: Promise<Response>
  resolve: (value: Response) => void
}

function deferredResponse(): DeferredResponse {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function response(name: string, total = 1, price = 1234.5) {
  return new Response(
    JSON.stringify({ items: [{ id: name, name, price }], total }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

beforeEach(() => {
  history.replaceState(null, '', '/search?q=tea&page=2&locale=fr-FR')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('hydrates its canonical search state from the URL and formats in that locale', async () => {
  const fetchMock = vi.fn(() => Promise.resolve(response('Thé', 2)))
  vi.stubGlobal('fetch', fetchMock)

  const wrapper = mount(SearchPage)
  await flushPromises()

  expect(wrapper.get('input[name="query"]').element).toHaveProperty('value', 'tea')
  expect(fetchMock).toHaveBeenCalledWith('/api/search?q=tea&page=2', expect.anything())
  expect(wrapper.text()).toContain('2 résultats')
  expect(wrapper.text()).toContain('1 234,50 €')
})

test('writes submissions to history and restores state on back or forward navigation', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response('Result'))))
  const pushState = vi.spyOn(history, 'pushState')
  const wrapper = mount(SearchPage)
  await flushPromises()

  await wrapper.get('input[name="query"]').setValue('coffee')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  expect(pushState).toHaveBeenCalled()
  expect(location.search).toContain('q=coffee')
  expect(location.search).toContain('page=1')

  history.replaceState(null, '', '/search?q=cocoa&page=3&locale=en-US')
  window.dispatchEvent(new PopStateEvent('popstate'))
  await flushPromises()

  expect(wrapper.get('input[name="query"]').element).toHaveProperty('value', 'cocoa')
  expect(fetch).toHaveBeenLastCalledWith('/api/search?q=cocoa&page=3', expect.anything())
})

test('prevents an older request from replacing a newer search result', async () => {
  const first = deferredResponse()
  const second = deferredResponse()
  vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise))

  const wrapper = mount(SearchPage)
  await wrapper.get('input[name="query"]').setValue('new')
  await wrapper.get('form').trigger('submit')

  second.resolve(response('Newest'))
  await flushPromises()
  first.resolve(response('Stale'))
  await flushPromises()

  expect(wrapper.text()).toContain('Newest')
  expect(wrapper.text()).not.toContain('Stale')
})
