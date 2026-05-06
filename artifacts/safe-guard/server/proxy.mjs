/**
 * Dev proxy server — runs on $PORT and:
 *   - forwards /api-server/api/* → localhost:8080/api/*  (same-origin API, no CORS)
 *   - forwards everything else    → localhost:$EXPO_PORT  (Expo dev bundler)
 *   - WebSocket upgrade           → localhost:$EXPO_PORT  (HMR / hot reload)
 *
 * The Origin header is stripped before forwarding to Expo because Metro's built-in
 * CorsMiddleware throws "Unauthorized request" (→ 500) for unknown origins, which
 * breaks font/asset loading on web. Without an Origin header, Metro serves the
 * files normally.
 */
import http from "node:http";
import httpProxy from "http-proxy";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const EXPO_PORT = parseInt(process.env.EXPO_INTERNAL_PORT ?? String(PORT + 1), 10);
const API_PORT = 8080;

const proxy = httpProxy.createProxyServer({ ws: true, changeOrigin: true });

proxy.on("error", (err, _req, res) => {
  if (res && !res.headersSent) {
    res.writeHead(502);
    res.end("Bad gateway");
  }
});

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  if (url.startsWith("/api-server/api")) {
    // Rewrite path: /api-server/api/contacts → /api/contacts
    req.url = url.replace(/^\/api-server\/api/, "/api");
    proxy.web(req, res, { target: `http://localhost:${API_PORT}` });
  } else {
    // Strip the Origin header so Metro's CorsMiddleware doesn't reject the
    // request — this allows fonts, assets, and HMR to load correctly.
    delete req.headers["origin"];
    proxy.web(req, res, { target: `http://localhost:${EXPO_PORT}` });
  }
});

// Forward WebSocket upgrades (Expo HMR / fast-refresh)
server.on("upgrade", (req, socket, head) => {
  delete req.headers["origin"];
  proxy.ws(req, socket, head, { target: `http://localhost:${EXPO_PORT}` });
});

server.listen(PORT, () => {
  console.log(`[proxy] listening on :${PORT}`);
  console.log(`[proxy] /api-server/api → localhost:${API_PORT}`);
  console.log(`[proxy] everything else → localhost:${EXPO_PORT} (Expo)`);
});
