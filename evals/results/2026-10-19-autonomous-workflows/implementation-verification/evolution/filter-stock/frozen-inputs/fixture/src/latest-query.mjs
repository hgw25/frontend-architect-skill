export function createLatestQueryRunner(query, view) {
  let currentRequest = 0;
  return filters => {
    const request = ++currentRequest;
    view.start();
    query({ ...filters })
      .then(result => {
        if (request === currentRequest) view.succeed(result);
      })
      .catch(error => {
        if (request === currentRequest) view.fail(error);
      })
      .finally(() => {
        if (request === currentRequest) view.finish();
      });
  };
}
