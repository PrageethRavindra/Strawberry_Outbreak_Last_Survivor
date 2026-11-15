(function () {
  async function request(path, method = 'GET', body) {
    const response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      // Non-JSON reply (e.g. an HTML 404 page from an outdated server).
      throw new Error(response.status === 404
        ? `The server does not support ${path} — restart it with npm start`
        : `Unexpected server response (${response.status})`);
    }
    if (!response.ok) throw new Error(payload.error || 'Request failed');
    return payload;
  }
  window.GameApi = {
    get: path => request(path),
    post: (path, body = {}) => request(path, 'POST', body)
  };
})();