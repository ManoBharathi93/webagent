package brain

import (
	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spi"
)

// Registry is the model slot. A business picks its reasoning provider from it; an empty
// pick resolves to the default (echo), so the framework runs with no credentials.
var Registry = spi.New[core.Brain]("model")

func init() {
	Registry.Register(spi.Descriptor{
		Name:    "echo",
		Summary: "model-free deterministic brain (zero-config default; wiring/demo/tests)",
	}, func(map[string]any) (core.Brain, error) { return Echo{}, nil })
	Registry.SetDefault("echo")
}
