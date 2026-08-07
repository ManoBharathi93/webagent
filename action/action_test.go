package action

import (
	"context"
	"fmt"
	"testing"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/guardrail"
)

// erroringGuardrail always fails its Inspect call.
type erroringGuardrail struct{}

func (erroringGuardrail) Name() string { return "erroring" }
func (erroringGuardrail) Inspect(context.Context, core.GuardInput) (core.Decision, error) {
	return core.Decision{}, fmt.Errorf("guardrail unavailable")
}

type dangerousTool struct{ ran *bool }

func (dangerousTool) Name() string { return "transfer_funds" }
func (d dangerousTool) Call(context.Context, map[string]any) (map[string]any, error) {
	*d.ran = true
	return map[string]any{"ok": true}, nil
}

type benignTool struct{ ran *bool }

func (benignTool) Name() string { return "get_status" }
func (b benignTool) Call(context.Context, map[string]any) (map[string]any, error) {
	*b.ran = true
	return map[string]any{"ok": true}, nil
}

type schemaTool struct{}

func (schemaTool) Name() string                                                 { return "lookup" }
func (schemaTool) Call(context.Context, map[string]any) (map[string]any, error) { return nil, nil }
func (schemaTool) Description() string                                          { return "look things up" }
func (schemaTool) Schema() map[string]any                                       { return map[string]any{"type": "object"} }

// The core safety property: a blocked action NEVER executes. Enforced in the wrapper, so the
// model cannot route around it.
func TestGuardBlocksDangerousToolDeterministically(t *testing.T) {
	g, _ := guardrail.Registry.Get("basic", nil)
	ran := false
	tool := Guard(dangerousTool{ran: &ran}, g)
	out, err := tool.Call(context.Background(), map[string]any{"amount": 100})
	if err != nil {
		t.Fatal(err)
	}
	if ran {
		t.Fatal("a blocked tool must NOT execute")
	}
	if out["error"] != "blocked_by_guardrail" {
		t.Fatalf("expected a blocked result, got %v", out)
	}
}

// Fail-closed: if the guardrail itself errors, the tool must NOT execute.
func TestGuardFailsClosedOnGuardrailError(t *testing.T) {
	ran := false
	tool := Guard(benignTool{ran: &ran}, erroringGuardrail{})
	out, err := tool.Call(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if ran {
		t.Fatal("tool must NOT execute when the guardrail errors (fail-closed)")
	}
	if out["error"] != "blocked_by_guardrail" {
		t.Fatalf("expected a blocked result on guardrail error, got %v", out)
	}
}

func TestGuardAllowsBenignTool(t *testing.T) {
	g, _ := guardrail.Registry.Get("basic", nil)
	ran := false
	tool := Guard(benignTool{ran: &ran}, g)
	if _, err := tool.Call(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	if !ran {
		t.Fatal("a benign tool should execute")
	}
}

func TestGuardPreservesName(t *testing.T) {
	g, _ := guardrail.Registry.Get("basic", nil)
	if Guard(benignTool{ran: new(bool)}, g).Name() != "get_status" {
		t.Fatal("guard must preserve the tool name")
	}
}

// Wrapping must not hide the tool's schema from the model.
func TestGuardForwardsSchema(t *testing.T) {
	g, _ := guardrail.Registry.Get("basic", nil)
	wrapped := Guard(schemaTool{}, g)
	ts, ok := wrapped.(core.ToolSchema)
	if !ok {
		t.Fatal("guard must forward the ToolSchema capability")
	}
	if ts.Description() != "look things up" {
		t.Fatalf("description not forwarded: %q", ts.Description())
	}
}

// A nil guardrail is a passthrough (no wrapping).
func TestGuardNilIsPassthrough(t *testing.T) {
	ran := false
	tool := Guard(benignTool{ran: &ran}, nil)
	if _, err := tool.Call(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	if !ran {
		t.Fatal("passthrough tool should execute")
	}
}
