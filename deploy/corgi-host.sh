#!/usr/bin/env bash
# Run this on the EC2 host. Installs bun, checks out the corgi branch, starts systemd.
set -euo pipefail

ROOT="${WEBAGENT_ROOT:-/opt/webagent}"
BRANCH="${WEBAGENT_BRANCH:-cursor/corgi-webagent-e5be}"
REPO="${WEBAGENT_REPO:-https://github.com/TheAgent-net/webagent.git}"
PORT="${WEBAGENT_CORGI_PORT:-8788}"

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

if [ ! -f "$ROOT/.env.corgi" ]; then
  cat > "$ROOT/.env.corgi" <<EOF
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
WEBAGENT_PUBLIC_URL=https://corgi.agentnet.it.com
EOF
  echo "Created $ROOT/.env.corgi — set OPENAI_API_KEY, then rerun"
  exit 1
fi

sudo cp "$ROOT/deploy/corgi.service" /etc/systemd/system/webagent-corgi.service
sudo sed -i "s|WorkingDirectory=.*|WorkingDirectory=$ROOT|" /etc/systemd/system/webagent-corgi.service
sudo sed -i "s|EnvironmentFile=-.*|EnvironmentFile=-$ROOT/.env.corgi|" /etc/systemd/system/webagent-corgi.service
sudo sed -i "s|:8788|:$PORT|" /etc/systemd/system/webagent-corgi.service
sudo systemctl daemon-reload
sudo systemctl enable --now webagent-corgi
sleep 2
sudo systemctl --no-pager --full status webagent-corgi || true
curl -sS "http://127.0.0.1:${PORT}/agent.json"
echo
