# Host the Composio agent on EC2

The process binds `0.0.0.0:8787`. systemd keeps it up. Put secrets in `/opt/webagent/.env`. Do not commit that file.

## On the instance

```sh
sudo mkdir -p /opt/webagent
# write OPENAI_API_KEY and WEBAGENT_PUBLIC_URL=http://<public-ip>:8787
sudo tee /opt/webagent/.env >/dev/null <<EOF
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
WEBAGENT_PUBLIC_URL=http://YOUR_EC2_PUBLIC_IP:8787
EOF
chmod 600 /opt/webagent/.env
curl -fsSL https://raw.githubusercontent.com/TheAgent-net/webagent/cursor/composio-agent-e5be/deploy/host.sh | bash
```

Open TCP **8787** on the security group.

Check:

```sh
curl -sS http://127.0.0.1:8787/agent.json
curl -sS -X POST http://127.0.0.1:8787/chat \
  -H 'content-type: application/json' \
  -d '{"text":"I need to email customers","from":"human"}'
```

Human URL: `http://<public-ip>:8787/`  
Machine URL: `http://<public-ip>:8787/mcp`

## From a laptop with SSH

```sh
WEBAGENT_HOST=ubuntu@ec2-xx.compute.amazonaws.com WEBAGENT_ENV=.env ./deploy/push.sh
```

This cloud agent has no SSH key and no AWS identity, so it cannot run `push.sh` for you.
