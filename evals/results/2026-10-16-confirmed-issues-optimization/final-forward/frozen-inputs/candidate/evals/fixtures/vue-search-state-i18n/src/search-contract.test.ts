import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, test, vi } from 'vitest'
import SearchPage from './SearchPage.vue'

afterEach(() => vi.unstubAllGlobals())

function response(name: string) {
  return new Response(JSON.stringify({ items: [{ id: name, name, price: 10 }], total: 1 }),
    { status: 200, headers: { 'content-type': 'application/json' } })
}

test('a replacement search communicates pending work before accepting new results', async () => {
  history.replaceState(null, '', '/search?q=old&page=2&locale=en-US')
  let resolve!: (value: Response) => void
  const pending = new Promise<Response>(done => { resolve = done })
  const fetchMock = vi.fn().mockResolvedValueOnce(response('Old item')).mockReturnValueOnce(pending)
  vi.stubGlobal('fetch', fetchMock)
  const wrapper = mount(SearchPage)
  try {
    await flushPromises()
    expect(wrapper.text()).toContain('Old item')
    await wrapper.get('input[name="query"]').setValue('new')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const status = wrapper.findAll('[role="status"], [role="progressbar"]').some(node =>
      node.isVisible() && Boolean(node.text() || node.attributes('aria-label')))
    const busy = wrapper.findAll('[aria-busy="true"]').some(node => node.isVisible())
    const visibleProgress = /\b(searching|loading|updating|waiting)\b|please wait|…/i.test(wrapper.text())
      || wrapper.get('button[type="submit"]').attributes('disabled') !== undefined
    expect(status || (busy && visibleProgress)).toBe(true)
    resolve(response('New item'))
    await flushPromises()
    expect(wrapper.text()).toContain('New item')
  } finally {
    wrapper.unmount()
  }
})

test('locale and page navigation use committed query and update language', async () => {
  history.replaceState(null, '', '/search?q=tea&page=2&locale=fr-FR')
  const fetchMock = vi.fn().mockResolvedValue(response('Tea'))
  vi.stubGlobal('fetch', fetchMock)
  const wrapper = mount(SearchPage)
  try {
    await flushPromises()
    await wrapper.get('input[name="query"]').setValue('unsaved')
    const localeControl = wrapper.find('select[name="locale"]')
    const nextPageControl = wrapper.find('nav button:last-child')
    if (localeControl.exists() && nextPageControl.exists()) {
      await localeControl.setValue('en-US')
      await nextPageControl.trigger('click')
      expect(wrapper.get('input[name="query"]').element).toHaveProperty('value', 'unsaved')
    } else {
      // History navigation is required; dedicated locale/page controls are not.
      history.replaceState(null, '', '/search?q=tea&page=3&locale=en-US')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    await flushPromises()
    expect(wrapper.get('main').attributes('lang') === 'en-US'
      || document.documentElement.lang === 'en-US').toBe(true)
    const url = new URL(location.href)
    expect(url.searchParams.get('page')).toBe('3')
    expect(url.searchParams.get('locale')).toBe('en-US')
    expect(url.searchParams.get('q')).toBe('tea')
    const requested = String(fetchMock.mock.calls.at(-1)?.[0])
    expect(new URL(requested, location.origin).searchParams.get('q')).toBe('tea')
    expect(new URL(requested, location.origin).searchParams.get('page')).toBe('3')
  } finally {
    wrapper.unmount()
  }
})
