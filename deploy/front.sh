#!/usr/bin/env bash
# Publish the apps agent on composio.agentnet.it.com via the existing
# docker nginx (port 80 + 443). Does not change app.agentnet.market.
set -euo pipefail

NGINX_CONF="${WEBAGENT_NGINX_CONF:-/home/ec2-user/agentnet-platform/deploy/nginx.conf}"
CERT_DIR="$(dirname "$NGINX_CONF")/certs"
MARKER="Composio webagent"
HOST_NAME="${WEBAGENT_FRONT_HOST:-composio.agentnet.it.com}"
HOST_ALIASES="${WEBAGENT_FRONT_HOST_ALIASES:-ec2-54-89-43-219.compute-1.amazonaws.com}"
PORT="${WEBAGENT_PORT:-8787}"

if [ ! -f "$NGINX_CONF" ]; then
  echo "missing $NGINX_CONF"
  exit 1
fi

GW="$(docker inspect agentnet-nginx --format '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}')"
if [ -z "$GW" ]; then
  echo "could not read docker gateway for agentnet-nginx"
  exit 1
fi

mkdir -p "$CERT_DIR/acme/.well-known/acme-challenge"
LE_FULL="/etc/letsencrypt/live/${HOST_NAME}/fullchain.pem"
LE_KEY="/etc/letsencrypt/live/${HOST_NAME}/privkey.pem"
if [ -r "$LE_FULL" ] && [ -r "$LE_KEY" ]; then
  cp "$LE_FULL" "$CERT_DIR/composio.crt"
  cp "$LE_KEY" "$CERT_DIR/composio.key"
elif sudo test -f "$LE_FULL" && sudo test -f "$LE_KEY"; then
  sudo cp "$LE_FULL" "$CERT_DIR/composio.crt"
  sudo cp "$LE_KEY" "$CERT_DIR/composio.key"
  sudo chown "$(id -un):$(id -gn)" "$CERT_DIR/composio.crt" "$CERT_DIR/composio.key"
fi
if [ -f "$CERT_DIR/composio.crt" ] && [ -f "$CERT_DIR/composio.key" ]; then
  chmod 644 "$CERT_DIR/composio.crt" "$CERT_DIR/composio.key"
fi
if [ ! -f "$CERT_DIR/composio.crt" ] || [ ! -f "$CERT_DIR/composio.key" ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 3 \
    -subj "/CN=$HOST_NAME" \
    -keyout "$CERT_DIR/composio.key" \
    -out "$CERT_DIR/composio.crt"
  chmod 644 "$CERT_DIR/composio.crt" "$CERT_DIR/composio.key"
fi

cp -a "$NGINX_CONF" "$NGINX_CONF.bak.composio"
python3 - "$NGINX_CONF" "$MARKER" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
marker = sys.argv[2]
text = p.read_text()
idx = text.find("# " + marker)
if idx >= 0:
    p.write_text(text[:idx].rstrip() + "\n")
PY

cat >> "$NGINX_CONF" <<EOF

# ${MARKER} — dedicated Host only. Not app.agentnet.market.
server {
    listen 80;
    listen 443 ssl;
    server_name ${HOST_NAME} ${HOST_ALIASES};
    ssl_certificate /etc/nginx/certs/composio.crt;
    ssl_certificate_key /etc/nginx/certs/composio.key;

    location /.well-known/acme-challenge/ {
        root /etc/nginx/certs/acme;
        default_type text/plain;
    }

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

if ! docker exec agentnet-nginx nginx -t; then
  if [ -f "$NGINX_CONF.bak.composio" ]; then
    cp -a "$NGINX_CONF.bak.composio" "$NGINX_CONF"
  fi
  echo "nginx -t failed; restored backup"
  exit 1
fi
docker exec agentnet-nginx nginx -s reload
echo "front https://${HOST_NAME}/"
curl -skS -m 10 --resolve "${HOST_NAME}:443:127.0.0.1" "https://${HOST_NAME}/.well-known/agent-card.json"
echo
