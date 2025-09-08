export default {
  async fetch(req, env) {
    const token = req.headers.get("x-auth")||"";
    if (token !== env.SHARED_TOKEN) {
      return withCORS(new Response("Unauthorized", { status: 401 }), req);
    }
    const method = req.method.toUpperCase();
    if (method === "OPTIONS") return withCORS(new Response(null, { status: 204 }), req);
    if (!["GET","PUT"].includes(method)) return withCORS(new Response("Method Not Allowed",{status:405}),req);

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/+/,"");
    if (path !== "Training/fittrack.json") {
      return withCORS(new Response("Forbidden path",{status:403}),req);
    }

    const davUrl = `https://dav.jianguoyun.com/dav/${path}`;
    const auth = btoa(`${env.NUTSTORE_USER}:${env.NUTSTORE_PASS}`);
    const headers = new Headers(req.headers);
    headers.set("Authorization",`Basic ${auth}`);
    headers.delete("x-auth");

    const init = { method, headers, body: method==="PUT"?await req.arrayBuffer():undefined };
    const upstream = await fetch(davUrl, init);
    const buf = await upstream.arrayBuffer();
    const out = new Response(buf, { status:upstream.status, statusText:upstream.statusText });
    out.headers.set("Content-Type", upstream.headers.get("Content-Type")||"application/json");
    out.headers.set("Access-Control-Expose-Headers","ETag, Last-Modified, Content-Length");
    return withCORS(out, req);
  }
};

function withCORS(res, req) {
  const origin = req.headers.get("Origin")||"*";
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Credentials","true");
  res.headers.set("Access-Control-Allow-Methods","GET,PUT,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers","Content-Type, X-Auth");
  res.headers.append("Vary","Origin");
  return res;
}
