export function createApi(request) {
  return {
    list: query => {
      const params = new URLSearchParams({ q: query.title, status: query.status });
      if (query.cursor) params.set('cursor', query.cursor);
      return request(`/community?${params}`);
    },
    creators: () => request('/community/creators'),
    publish: payload => request('/community', { method: 'POST', body: payload }),
  };
}
