// Package build assembles a runnable core.Agent from a declarative spec by resolving each
// chosen provider from its slot registry. Empty picks resolve to slot defaults. This is the
// step that turns "a business filled in the template" into "a running web agent."
package build

import (
	"fmt"

	"github.com/TheAgent-net/webagent/brain"
	"github.com/TheAgent-net/webagent/channels"
	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/guardrail"
	"github.com/TheAgent-net/webagent/memory"
	"github.com/TheAgent-net/webagent/present"
	"github.com/TheAgent-net/webagent/retrieval"
	"github.com/TheAgent-net/webagent/spec"
)

// Build resolves the spec's picks across every slot — including the model (brain) — and
// wires them together. tools is the action layer (the MCP's tools), supplied by the caller
// since it depends on live auth. Empty picks resolve to slot defaults.
func Build(s *spec.AgentSpec, tools []core.Tool) (*core.Agent, error) {
	br, err := brain.Registry.Get(s.Model.Type, s.Model.Config)
	if err != nil {
		return nil, wrap(s, err)
	}
	r, err := retrieval.Registry.Get(s.Retrieval.Type, s.Retrieval.Config)
	if err != nil {
		return nil, wrap(s, err)
	}
	mem, err := memory.Registry.Get(s.Memory.Type, s.Memory.Config)
	if err != nil {
		return nil, wrap(s, err)
	}
	guard, err := guardrail.Registry.Get(s.Guardrail.Type, s.Guardrail.Config)
	if err != nil {
		return nil, wrap(s, err)
	}

	var bindings []core.ChannelBinding
	for i, cs := range s.Channels {
		p, err := present.Registry.Get(cs.Presenter, nil)
		if err != nil {
			return nil, fmt.Errorf("%s: channels[%d]: %w", s.Name, i, err)
		}
		ch, err := channels.Registry.Get(cs.Type, cs.Config)
		if err != nil {
			return nil, fmt.Errorf("%s: channels[%d]: %w", s.Name, i, err)
		}
		bindings = append(bindings, core.ChannelBinding{Channel: ch, Presenter: p})
	}

	return &core.Agent{
		Name:        s.Name,
		Instruction: s.Instruction,
		Brain:       br,
		Retriever:   r,
		Memory:      mem,
		Guardrail:   guard,
		Tools:       tools,
		Bindings:    bindings,
	}, nil
}

func wrap(s *spec.AgentSpec, err error) error { return fmt.Errorf("%s: %w", s.Name, err) }
