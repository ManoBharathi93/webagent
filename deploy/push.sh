#!/usr/bin/env bash
# From a laptop that can SSH to the EC2 host:
#   WEBAGENT_HOST=ubuntu@ec2-xx.compute.amazonaws.com ./deploy/push.sh
set -euo pipefail

HOST="${WEBAGENT_HOST:?set WEBAGENT_HOST to user@host}"
ROOT="${WEBAGENT_ROOT:-/opt/webagent}"
ENV_FILE="${WEBAGENT_ENV:-.env}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "${WEBAGENT_SSH_KEY:-}" ]; then
  SSH_OPTS+=(-i "$WEBAGENT_SSH_KEY")
fi

ssh "${SSH_OPTS[@]}" "$HOST" "sudo mkdir -p $ROOT && sudo chown \$(id -un):\$(id -gn) $ROOT"
if [ -f "$ENV_FILE" ]; then
  scp "${SSH_OPTS[@]}" "$ENV_FILE" "$HOST:$ROOT/.env"
fi
ssh "${SSH_OPTS[@]}" "$HOST" "bash -s" < "$(dirname "$0")/host.sh"
