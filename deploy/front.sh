#!/usr/bin/env bash
# Optional: publish the apps agent on the EC2 public DNS via the existing
# docker nginx (port 80). Does not change the app.agentnet.market server.
set -euo pipefail

NGINX_CONF="${WEBAGENT_NGINX_CONF:-/home/ec2-user/agentnet-platform/deploy/nginx.conf}"
MARKER="Composio webagent"
HOST_NAME="${WEBAGENT_FRONT_HOST:-ec2-54-89-43-219.compute-1.amazonaws.com}"
PORT="${WEBAGENT_PORT:-8787}"

if [ ! -f "$NGINX_CONF" ]; then
  echo "missing $NGINX_CONF"
  exit 1
fi

if grep -q "$MARKER" "$NGINX_CONF"; then
  echo "nginx already has the Composio server block"
else
  GW="$(docker inspect agentnet-nginx --format '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}')"
  if [ -z "$GW" ]; then
    echo "could not read docker gateway for agentnet-nginx"
    exit 1
  fi
  cp -a "$NGINX_CONF" "$NGINX_CONF.bak.composio"
  cat >> "$NGINX_CONF" <<EOF

# ${MARKER} — dedicated Host only. Not app.agentnet.market.
server {
    listen 80;
    server_name ${HOST_NAME};

    location / {
        proxy_pass http://${GW}:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF
fi

if ! docker exec agentnet-nginx nginx -t; then
  if [ -f "$NGINX_CONF.bak.composio" ]; then
    cp -a "$NGINX_CONF.bak.composio" "$NGINX_CONF"
  fi
  echo "nginx -t failed; restored backup"
  exit 1
fi
docker exec agentnet-nginx nginx -s reload
echo "front http://${HOST_NAME}/"
curl -sS -m 10 "http://127.0.0.1/agent.json" -H "Host: ${HOST_NAME}"
echo
