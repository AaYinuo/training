export async function onRequest(context) {
  const { request, env } = context;
  try {
    const token = request.headers.get('x-auth') || '';
    if (token !== env.SHARED_TOKEN) {
      return cors(new Response('Unauthorized', { status: 401 }), request);
    }

    const method = request.method.toUpperCase();
    if (method === 'OPTIONS')
      return cors(new Response(null, { status: 204 }), request);
    if (!['GET', 'PUT'].includes(method))
      return cors(new Response('Method Not Allowed', { status: 405 }), request);

    const dav = 'https://dav.jianguoyun.com/dav/Training/fittrack.json';
    const auth = btoa(`${env.NUTSTORE_USER}:${env.NUTSTORE_PASS}`);

    const h = new Headers();
    h.set('Authorization', `Basic ${auth}`);
    if (method === 'PUT')
      h.set('Content-Type', request.headers.get('Content-Type') || 'application/json');

    const upstream = await fetch(dav, {
      method,
      headers: h,
      body: method === 'PUT' ? await request.arrayBuffer() : undefined
    });

    const buf = await upstream.arrayBuffer();
    const res = new Response(buf, { status: upstream.status, statusText: upstream.statusText });
    res.headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    res.headers.set('Access-Control-Expose-Headers', 'ETag, Last-Modified, Content-Length');
    return cors(res, request);
  } catch (e) {
    return cors(new Response('UPSTREAM_ERR: ' + (e.message || e), { status: 502 }), request);
  }
}

function cors(res, req) {
  const o = req.headers.get('Origin') || '*';
  res.headers.set('Access-Control-Allow-Origin', o);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Auth');
  res.headers.append('Vary', 'Origin');
  return res;
}
