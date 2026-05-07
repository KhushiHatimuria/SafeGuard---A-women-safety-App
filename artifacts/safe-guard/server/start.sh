#!/bin/sh
# Export env vars so ALL subsequent commands (proxy + expo) inherit them
export EXPO_PACKAGER_PROXY_URL="https://${REPLIT_EXPO_DEV_DOMAIN}"
export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID}"
export EXPO_INTERNAL_PORT="$((PORT + 1))"

echo "[start] EXPO_PACKAGER_PROXY_URL=${EXPO_PACKAGER_PROXY_URL}"
echo "[start] EXPO_PUBLIC_DOMAIN=${EXPO_PUBLIC_DOMAIN}"
echo "[start] Proxy on :${PORT}, Metro on :${EXPO_INTERNAL_PORT}"

# Start the dev proxy in the background
node server/proxy.mjs &

# Give Metro a moment to start
sleep 3

# Start Expo Metro bundler — EXPO_PACKAGER_PROXY_URL is now in the environment
exec pnpm exec expo start --port "${EXPO_INTERNAL_PORT}"
