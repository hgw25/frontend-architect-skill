import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import SearchPage from './SearchPage.vue'
import {writeFileSync} from 'node:fs'

function response(name: string) {
  return new Response(JSON.stringify({items:[{id:name,name,price:10}],total:1}),
    {status:200,headers:{'content-type':'application/json'}})
}

test('capture feedback while a replacement search remains pending', async () => {
  history.replaceState(null, '', '/search?q=old&page=2&locale=en-US')
  let resolve!: (value: Response) => void
  const pending = new Promise<Response>((done) => { resolve = done })
  const fetchMock = vi.fn().mockResolvedValueOnce(response('Old item'))
    .mockImplementationOnce(() => pending)
  vi.stubGlobal('fetch', fetchMock)
  const wrapper = mount(SearchPage)
  try {
    await flushPromises()
    expect(wrapper.text()).toContain('Old item')
    await wrapper.get('input[name="query"]').setValue('new')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const before = {mainAttributes:wrapper.get('main').attributes(), busyRegions:wrapper.findAll('[aria-busy]').map(node=>({tag:node.element.tagName,value:node.attributes('aria-busy')})), liveRegions:wrapper.findAll('[aria-live]').map(node=>({tag:node.element.tagName,value:node.attributes('aria-live'),text:node.text()})), statusTexts:wrapper.findAll('[role="status"]').map(node=>node.text()),
      submitText:wrapper.get('button[type="submit"]').text(),text:wrapper.text()}
    resolve(response('New item'))
    await flushPromises()
    expect(wrapper.text()).toContain('New item')
    const after = {mainAttributes:wrapper.get('main').attributes(), busyRegions:wrapper.findAll('[aria-busy]').map(node=>({tag:node.element.tagName,value:node.attributes('aria-busy')})), liveRegions:wrapper.findAll('[aria-live]').map(node=>({tag:node.element.tagName,value:node.attributes('aria-live'),text:node.text()})), statusTexts:wrapper.findAll('[role="status"]').map(node=>node.text()),
      submitText:wrapper.get('button[type="submit"]').text(),text:wrapper.text()}
    writeFileSync('pending-observation.json', JSON.stringify({before,after}))
  } finally {
    wrapper.unmount()
    vi.unstubAllGlobals()
  }
})
