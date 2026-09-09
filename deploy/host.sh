#!/usr/bin/env bash
# Run this on the EC2 host. Installs bun, checks out the apps branch, starts systemd.
set -euo pipefail

ROOT="${WEBAGENT_ROOT:-/opt/webagent}"
BRANCH="${WEBAGENT_BRANCH:-cursor/composio-agent-e5be}"
REPO="${WEBAGENT_REPO:-https://github.com/TheAgent-net/webagent.git}"
PORT="${WEBAGENT_PORT:-8787}"

if ! command -v git >/dev/null; then
  sudo apt-get update -y
  sudo apt-get install -y git ca-certificates curl
fi

if [ ! -x "$HOME/.bun/bin/bun" ]; then
  curl -fsSL https://bun.sh/install | bash
fi
export PATH="$HOME/.bun/bin:$PATH"
sudo ln -sfn "$HOME/.bun/bin/bun" /usr/local/bin/bun

sudo mkdir -p "$ROOT"
sudo chown "$(id -un):$(id -gn)" "$ROOT"
if [ ! -d "$ROOT/.git" ]; then
  git clone "$REPO" "$ROOT"
fi
cd "$ROOT"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
bun install

if [ ! -f "$ROOT/.env" ]; then
  echo "missing $ROOT/.env — write OPENAI_API_KEY and WEBAGENT_PUBLIC_URL, then rerun"
  exit 1
fi

sudo cp "$ROOT/deploy/apps.service" /etc/systemd/system/webagent-apps.service
sudo sed -i "s|WorkingDirectory=.*|WorkingDirectory=$ROOT|" /etc/systemd/system/webagent-apps.service
sudo sed -i "s|EnvironmentFile=-.*|EnvironmentFile=-$ROOT/.env|" /etc/systemd/system/webagent-apps.service
sudo sed -i "s|:8787|:$PORT|" /etc/systemd/system/webagent-apps.service
sudo systemctl daemon-reload
sudo systemctl enable --now webagent-apps
sleep 1
sudo systemctl --no-pager --full status webagent-apps || true
curl -sS "http://127.0.0.1:${PORT}/agent.json"
echo
