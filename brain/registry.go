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
	// openrouter: the recommended start — one key, 300+ models across providers, preset
	// endpoint. A business just picks a model id (e.g. "anthropic/claude-sonnet-5").
	Registry.Register(spi.Descriptor{
		Name:         "openrouter",
		Summary:      "OpenRouter: one key, 300+ models across providers (recommended start; model-agnostic, tool-calling)",
		Capabilities: spi.Capabilities{"tools": true},
	}, newGateway("openrouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY"))
	// gateway: any other OpenAI-compatible endpoint — self-hosted LiteLLM, OpenAI, local vLLM.
	Registry.Register(spi.Descriptor{
		Name:         "gateway",
		Summary:      "any OpenAI-compatible endpoint (self-hosted LiteLLM / OpenAI / local vLLM)",
		Capabilities: spi.Capabilities{"tools": true},
	}, newGateway("gateway", "", "LLM_API_KEY"))
	Registry.SetDefault("echo")
}
