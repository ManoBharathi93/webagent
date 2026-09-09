#!/usr/bin/env bash
# certbot deploy hook: copy the renewed lineage into the nginx bind-mount
# and reload. Installed to /etc/letsencrypt/renewal-hooks/deploy/ by front.sh.
set -euo pipefail

case " ${RENEWED_DOMAINS:-} " in
  *" composio.agentnet.it.com "*) ;;
  *) exit 0 ;;
esac

LINEAGE="${RENEWED_LINEAGE:-/etc/letsencrypt/live/composio.agentnet.it.com}"
DEST="${WEBAGENT_CERT_DIR:-/home/ec2-user/agentnet-platform/deploy/certs}"

cp "$LINEAGE/fullchain.pem" "$DEST/composio.crt"
cp "$LINEAGE/privkey.pem" "$DEST/composio.key"
if id ec2-user >/dev/null 2>&1; then
  chown ec2-user:ec2-user "$DEST/composio.crt" "$DEST/composio.key"
fi
chmod 644 "$DEST/composio.crt"
chmod 600 "$DEST/composio.key"
docker exec agentnet-nginx nginx -s reload
