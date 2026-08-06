// Package guardrail is the guardrail slot: deterministic, code-enforced safety. This is a
// partner-provided slot — collaborating safety companies register adapters here. The
// built-in "basic" provider is the default: it blocks a small set of clearly-dangerous
// actions outright, so an agent is never shipped without a safety floor the LLM can't override.
package guardrail

import (
	"context"
	"strings"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spi"
)

// Registry is the guardrail slot.
var Registry = spi.New[core.Guardrail]("guardrail")

func init() {
	Registry.Register(spi.Descriptor{
		Name:    "basic",
		Summary: "deterministic deny-list for clearly-dangerous actions (built-in default)",
	}, newBasic)
	Registry.Register(spi.Descriptor{
		Name:    "off",
		Summary: "no-op; allows everything (trusted contexts only)",
	}, newOff)
	Registry.SetDefault("basic")
}

// basic blocks known-dangerous actions by name inspection. Deterministic and code-enforced;
// the LLM cannot override it. Partner guardrails (policy, PII, injection, toxicity) plug in
// as richer providers.
type basic struct{}

var dangerousActions = []string{"delete_account", "transfer_funds", "wipe", "drop_database"}

func newBasic(map[string]any) (core.Guardrail, error) { return basic{}, nil }

func (basic) Name() string { return "basic" }

func (basic) Inspect(_ context.Context, in core.GuardInput) (core.Decision, error) {
	if in.Stage == core.StageAction {
		a := strings.ToLower(in.Action)
		for _, d := range dangerousActions {
			if strings.Contains(a, d) {
				return core.Decision{Allow: false, Reason: "blocked dangerous action: " + in.Action}, nil
			}
		}
	}
	return core.Decision{Allow: true}, nil
}

type off struct{}

func newOff(map[string]any) (core.Guardrail, error) { return off{}, nil }

func (off) Name() string { return "off" }

func (off) Inspect(context.Context, core.GuardInput) (core.Decision, error) {
	return core.Decision{Allow: true}, nil
}
