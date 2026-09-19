#!/usr/bin/env bash
# Add corgi.agentnet.it.com to the existing docker nginx (port 80).
# Cloudflare terminates HTTPS (proxied A record).
# Does not change app.agentnet.market or composio.agentnet.it.com.
set -euo pipefail

NGINX_CONF="${WEBAGENT_NGINX_CONF:-/home/ec2-user/agentnet-platform/deploy/nginx.conf}"
MARKER="Corgi webagent"
HOST_NAME="${WEBAGENT_CORGI_HOST:-corgi.agentnet.it.com}"
PORT="${WEBAGENT_CORGI_PORT:-8788}"

if [ ! -f "$NGINX_CONF" ]; then
  echo "nginx.conf not found at $NGINX_CONF"
  echo "  set WEBAGENT_NGINX_CONF to the path"
  exit 1
fi

if grep -q "$MARKER" "$NGINX_CONF"; then
  echo "corgi block already in nginx.conf — reloading"
  docker exec agentnet-nginx nginx -s reload
  echo "front http://${HOST_NAME}/  (https via Cloudflare)"
  exit 0
fi

# Discover the docker bridge gateway so the container can reach the host port.
GW="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}' agentnet-nginx 2>/dev/null || true)"
if [ -z "$GW" ]; then
  GW="172.17.0.1"
  echo "warning: could not read docker gateway, defaulting to $GW"
fi

cat >> "$NGINX_CONF" <<EOF

# ${MARKER} — corgi.agentnet.it.com only.
server {
    listen 80;
    server_name ${HOST_NAME};

    location / {
        proxy_pass http://${GW}:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
EOF

echo "added corgi server block for ${HOST_NAME} → ${GW}:${PORT}"
if ! docker exec agentnet-nginx nginx -t; then
  echo "nginx config test failed — revert $NGINX_CONF"
  exit 1
fi
docker exec agentnet-nginx nginx -s reload
echo "front http://${HOST_NAME}/  (https via Cloudflare)"
curl -sS -m 10 "http://127.0.0.1/agent.json" -H "Host: ${HOST_NAME}"
echo
