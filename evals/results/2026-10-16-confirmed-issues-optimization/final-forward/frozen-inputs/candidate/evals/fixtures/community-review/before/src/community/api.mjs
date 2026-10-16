export function createApi(request) {
  return {
    list: () => request('/community'),
    publish: payload => request('/community', { method: 'POST', body: payload }),
  };
}
