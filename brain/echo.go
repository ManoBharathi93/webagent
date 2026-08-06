// Package brain holds Brain implementations. Echo is a deterministic, model-free
// brain so the framework builds, runs, and tests without any LLM credentials or
// network. Production swaps in the ADK/Gemini brain (which zomato-agent already is):
// same core.Brain interface, real reasoning over the same candidates and tools.
package brain

import (
	"context"
	"fmt"
	"strings"

	"github.com/TheAgent-net/webagent/core"
)

// Echo summarizes what a real brain would work from: the instruction in force, the
// retrieved candidates, and the tools available. Useful for wiring/demo/tests.
type Echo struct{}

func (Echo) Respond(_ context.Context, in core.BrainInput) (core.AgentMessage, error) {
	var b strings.Builder
	fmt.Fprintf(&b, "You said: %q.", in.Text)
	if len(in.Candidates) > 0 {
		fmt.Fprintf(&b, " Top candidates:")
		for _, c := range in.Candidates {
			fmt.Fprintf(&b, " %s (%.2f);", c.Title, c.Score)
		}
	} else {
		fmt.Fprintf(&b, " (no local candidates — a live brain would search the MCP directly)")
	}
	if len(in.Tools) > 0 {
		names := make([]string, 0, len(in.Tools))
		for _, t := range in.Tools {
			names = append(names, t.Name())
		}
		fmt.Fprintf(&b, " Tools: %s.", strings.Join(names, ", "))
	}
	return core.AgentMessage{Text: b.String()}, nil
}
