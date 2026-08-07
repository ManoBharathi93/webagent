package action

import (
	"context"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spi"
)

// Provider is the action slot: it yields the agent's grounded tools from the business's
// action config. Tools(ctx) does any live work (e.g. an MCP handshake) at build time, so a
// real MCP or browser provider fits this interface without changing anything downstream.
type Provider interface {
	Name() string
	Tools(ctx context.Context) ([]core.Tool, error)
}

// Registry is the action slot. Real MCP/browser/HAR providers register here as they are
// built (like the channel adapters). Until then, "none" is the safe default.
var Registry = spi.New[Provider]("action")

func init() {
	Registry.Register(spi.Descriptor{
		Name:    "none",
		Summary: "no provider-supplied tools (host injects tools, or discovery-only)",
	}, func(map[string]any) (Provider, error) { return none{}, nil })
	Registry.Register(spi.Descriptor{
		Name:    "demo",
		Summary: "trivial deterministic tools for demos/tests",
	}, func(map[string]any) (Provider, error) { return demo{}, nil })
	Registry.SetDefault("none")
}

type none struct{}

func (none) Name() string                               { return "none" }
func (none) Tools(context.Context) ([]core.Tool, error) { return nil, nil }

type demo struct{}

func (demo) Name() string { return "demo" }
func (demo) Tools(context.Context) ([]core.Tool, error) {
	return []core.Tool{echoTool{}}, nil
}

// echoTool is a harmless deterministic tool: it returns its own arguments.
type echoTool struct{}

func (echoTool) Name() string        { return "echo" }
func (echoTool) Description() string { return "Echo the given arguments back." }
func (echoTool) Schema() map[string]any {
	return map[string]any{"type": "object", "properties": map[string]any{}}
}
func (echoTool) Call(_ context.Context, args map[string]any) (map[string]any, error) {
	return map[string]any{"echo": args}, nil
}
