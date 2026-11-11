(function () {
  async function request(path, method = 'GET', body) {
    const response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Request failed');
    return payload;
  }
  window.GameApi = {
    get: path => request(path),
    post: (path, body = {}) => request(path, 'POST', body)
  };
})();