#!/usr/bin/env bash
# Add corgi.agentnet.it.com to the existing docker nginx (80 + 443).
# Does not change app.agentnet.market or composio.agentnet.it.com.
set -euo pipefail

NGINX_CONF="${WEBAGENT_NGINX_CONF:-/home/ec2-user/agentnet-platform/deploy/nginx.conf}"
CERT_DIR="${WEBAGENT_CERT_DIR:-/home/ec2-user/agentnet-platform/deploy/certs}"
MARKER="Corgi webagent"
HOST_NAME="${WEBAGENT_CORGI_HOST:-corgi.agentnet.it.com}"
PORT="${WEBAGENT_CORGI_PORT:-8788}"

if [ ! -f "$NGINX_CONF" ]; then
  echo "nginx.conf not found at $NGINX_CONF"
  exit 1
fi

GW="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}' agentnet-nginx 2>/dev/null || true)"
if [ -z "$GW" ]; then
  GW="172.19.0.1"
  echo "warning: could not read docker gateway, defaulting to $GW"
fi

mkdir -p "$CERT_DIR"
if [ ! -f "$CERT_DIR/corgi.crt" ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
    -keyout "$CERT_DIR/corgi.key" \
    -out "$CERT_DIR/corgi.crt" \
    -subj "/CN=${HOST_NAME}"
  chmod 644 "$CERT_DIR/corgi.crt"
  chmod 600 "$CERT_DIR/corgi.key"
fi

if grep -q "$MARKER" "$NGINX_CONF"; then
  echo "corgi block already in nginx.conf — reloading"
else
  cat >> "$NGINX_CONF" <<EOF

# ${MARKER} — ${HOST_NAME} only.
server {
    listen 80;
    listen 443 ssl;
    server_name ${HOST_NAME};
    ssl_certificate /etc/nginx/certs/corgi.crt;
    ssl_certificate_key /etc/nginx/certs/corgi.key;

    location / {
        proxy_pass http://${GW}:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_read_timeout 120s;
        proxy_buffering off;
    }
}
EOF
  echo "added corgi server block for ${HOST_NAME} → ${GW}:${PORT}"
fi

if ! docker exec agentnet-nginx nginx -t; then
  echo "nginx config test failed — revert $NGINX_CONF"
  exit 1
fi
docker exec agentnet-nginx nginx -s reload
echo "front https://${HOST_NAME}/"
curl -sS -m 10 "http://127.0.0.1/agent.json" -H "Host: ${HOST_NAME}"
echo
