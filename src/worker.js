export default {
  async fetch(req, env) {
    try {
      const token = req.headers.get('x-auth') || '';
      if (token !== env.SHARED_TOKEN)
        return cors(new Response('Unauthorized', { status: 401 }), req);

      const m = req.method.toUpperCase();
      if (m === 'OPTIONS') return cors(new Response(null, { status: 204 }), req);
      if (!['GET', 'PUT'].includes(m))
        return cors(new Response('Method Not Allowed', { status: 405 }), req);

      const path = new URL(req.url).pathname.replace(/^\/+/, '');
      if (path !== 'Training/fittrack.json')
        return cors(new Response('Forbidden path', { status: 403 }), req);

      // ---------------  上游  ----------------
      const dav = 'http://dav.jianguoyun.com/dav/Training/fittrack.json';  // http 避开 TLS
      const auth = btoa(`${env.NUTSTORE_USER}:${env.NUTSTORE_PASS}`);

      const h = new Headers({ Authorization: `Basic ${auth}` });
      if (m === 'PUT')
        h.set('Content-Type', req.headers.get('Content-Type') || 'application/json');

      // 简单重试 3 次，避免坚果云瞬时 503
      let up, retry = 3;
      while (retry--) {
        up = await fetch(dav, { method: m, headers: h, body: m === 'PUT' ? await req.arrayBuffer() : undefined });
        if (up.status !== 503) break;
        await new Promise(r => setTimeout(r, 1500));
      }

      const buf = await up.arrayBuffer();
      const res = new Response(buf, { status: up.status, statusText: up.statusText });
      res.headers.set('Content-Type', up.headers.get('Content-Type') || 'application/json');
      res.headers.set('Access-Control-Expose-Headers', 'ETag, Last-Modified, Content-Length');
      return cors(res, req);

    } catch (e) {
      return cors(new Response('UPSTREAM_ERR: ' + (e.message || e), { status: 502 }), req);
    }
  }
};

function cors(res, req) {
  const o = req.headers.get('Origin') || '*';
  res.headers.set('Access-Control-Allow-Origin', o);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Auth');
  res.headers.append('Vary', 'Origin');
  return res;
}
