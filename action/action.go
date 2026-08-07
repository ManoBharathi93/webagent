// Package action is the action layer: how an agent gets its grounded tools, and the
// deterministic safety enforcer every tool call passes through.
//
// Guard wraps a tool so that BEFORE it executes, the chosen guardrail inspects the action
// (StageAction). Because the wrapper sits between the brain and the tool, the model cannot
// bypass it — action safety is code-enforced, not prompt-enforced. This is the property the
// research calls non-negotiable ("even a 1% vulnerability rate is unacceptable").
package action

import (
	"context"
	"encoding/json"

	"github.com/TheAgent-net/webagent/core"
)

// Guard wraps a tool so the guardrail inspects the action before it runs. A nil guardrail
// returns the tool unchanged. The tool's ToolSchema capability (if any) is forwarded so
// wrapping does not hide the tool's argument schema from the model.
func Guard(t core.Tool, g core.Guardrail) core.Tool {
	if g == nil {
		return t
	}
	base := guardedTool{t: t, g: g}
	if s, ok := t.(core.ToolSchema); ok {
		return guardedSchemaTool{guardedTool: base, s: s}
	}
	return base
}

// GuardAll wraps every tool with the guardrail.
func GuardAll(tools []core.Tool, g core.Guardrail) []core.Tool {
	out := make([]core.Tool, len(tools))
	for i, t := range tools {
		out[i] = Guard(t, g)
	}
	return out
}

type guardedTool struct {
	t core.Tool
	g core.Guardrail
}

func (gt guardedTool) Name() string { return gt.t.Name() }

func (gt guardedTool) Call(ctx context.Context, args map[string]any) (map[string]any, error) {
	meta := map[string]string{}
	if b, err := json.Marshal(args); err == nil {
		meta["args"] = string(b)
	}
	dec, err := gt.g.Inspect(ctx, core.GuardInput{Stage: core.StageAction, Action: gt.t.Name(), Meta: meta})
	if err == nil && !dec.Allow {
		// Deterministic block: the tool never executes. Returned as a normal result (not a
		// Go error) so the model sees it was blocked and can respond, instead of the turn crashing.
		return map[string]any{"error": "blocked_by_guardrail", "reason": dec.Reason}, nil
	}
	return gt.t.Call(ctx, args)
}

// guardedSchemaTool additionally forwards the underlying tool's ToolSchema capability.
type guardedSchemaTool struct {
	guardedTool
	s core.ToolSchema
}

func (g guardedSchemaTool) Description() string    { return g.s.Description() }
func (g guardedSchemaTool) Schema() map[string]any { return g.s.Schema() }
