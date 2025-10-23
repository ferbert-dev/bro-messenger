(() => {
  const readMeta = (name) =>
    typeof document !== 'undefined'
      ? document.querySelector(`meta[name="${name}"]`)?.content.trim()
      : '';

  const apiBase = readMeta('api-base-url');
  const wsBase = readMeta('ws-base-url');

  if (apiBase) {
    window.API_BASE_URL = apiBase.replace(/\/$/, '');
    window.__API_BASE_URL__ = window.API_BASE_URL;
  }

  if (wsBase) {
    window.WS_BASE_URL = wsBase.replace(/\/$/, '');
    window.__WS_BASE_URL__ = window.WS_BASE_URL;
  }
})();
