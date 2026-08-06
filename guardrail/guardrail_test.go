package guardrail

import (
	"context"
	"testing"

	"github.com/TheAgent-net/webagent/conformance"
	"github.com/TheAgent-net/webagent/core"
)

func TestBasicGuardrailConformance(t *testing.T) {
	g, err := Registry.Get("basic", nil)
	if err != nil {
		t.Fatal(err)
	}
	conformance.Guardrail(t, g)
}

// basic must actually block a known-dangerous action — deterministic, code-enforced.
func TestBasicBlocksDangerousAction(t *testing.T) {
	g, _ := Registry.Get("basic", nil)
	d, err := g.Inspect(context.Background(), core.GuardInput{Stage: core.StageAction, Action: "transfer_funds"})
	if err != nil {
		t.Fatal(err)
	}
	if d.Allow {
		t.Fatal("basic guardrail must block transfer_funds")
	}
}
