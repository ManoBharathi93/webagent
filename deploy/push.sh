#!/usr/bin/env bash
# From a laptop that can SSH to the EC2 host:
#   WEBAGENT_HOST=ubuntu@ec2-xx.compute.amazonaws.com ./deploy/push.sh
set -euo pipefail

HOST="${WEBAGENT_HOST:?set WEBAGENT_HOST to user@host}"
ROOT="${WEBAGENT_ROOT:-/opt/webagent}"
ENV_FILE="${WEBAGENT_ENV:-.env}"

ssh -o StrictHostKeyChecking=accept-new "$HOST" "sudo mkdir -p $ROOT && sudo chown \$(id -un):\$(id -gn) $ROOT"
if [ -f "$ENV_FILE" ]; then
  scp "$ENV_FILE" "$HOST:$ROOT/.env"
fi
ssh "$HOST" "bash -s" < "$(dirname "$0")/host.sh"
