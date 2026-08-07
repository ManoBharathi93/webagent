package build

import (
	"context"
	"strings"
	"testing"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/observability"
	"github.com/TheAgent-net/webagent/spec"
)

// The whole point of the template: two totally different businesses assemble into a
// runnable agent from a spec alone, with different provider picks and no new code.
func TestBuildBothExampleBusinesses(t *testing.T) {
	for _, path := range []string{"../examples/zomato.json", "../examples/bakery.json"} {
		s, err := spec.Load(path)
		if err != nil {
			t.Fatalf("%s: load: %v", path, err)
		}
		a, err := Build(context.Background(), s)
		if err != nil {
			t.Fatalf("%s: build: %v", path, err)
		}
		if a.Retriever == nil || a.Memory == nil || a.Guardrail == nil || len(a.Bindings) == 0 {
			t.Fatalf("%s: agent not fully assembled", path)
		}
		msg, err := a.Handle(context.Background(), core.Turn{ChannelUserID: "u1", Text: "chocolate croissant"})
		if err != nil {
			t.Fatalf("%s: handle: %v", path, err)
		}
		if msg.Text == "" {
			t.Fatalf("%s: empty reply", path)
		}
	}
}

// Empty slot picks resolve to defaults — a minimal spec still yields a working agent.
func TestBuildResolvesDefaults(t *testing.T) {
	s := &spec.AgentSpec{
		Name:     "Minimal",
		Action:   spec.ActionSpec{MCPURL: "https://x/mcp"},
		Channels: []spec.ChannelSpec{{Type: "a2a"}}, // no retrieval/memory/guardrail/presenter picks
	}
	a, err := Build(context.Background(), s)
	if err != nil {
		t.Fatalf("build: %v", err)
	}
	if a.Retriever.Name() != "live" || a.Memory.Name() != "session" || a.Guardrail.Name() != "basic" {
		t.Fatalf("defaults not applied: r=%s m=%s g=%s", a.Retriever.Name(), a.Memory.Name(), a.Guardrail.Name())
	}
	if a.Bindings[0].Presenter.Name() != "text" {
		t.Fatalf("presenter default not applied: %s", a.Bindings[0].Presenter.Name())
	}
}

func TestBuildRejectsUnknownProvider(t *testing.T) {
	s := &spec.AgentSpec{
		Name:      "Broken",
		Action:    spec.ActionSpec{MCPURL: "https://x/mcp"},
		Retrieval: spec.ComponentSpec{Type: "does-not-exist"},
		Channels:  []spec.ChannelSpec{{Type: "web", Presenter: "text"}},
	}
	_, err := Build(context.Background(), s)
	if err == nil || !strings.Contains(err.Error(), "unknown retrieval provider") {
		t.Fatalf("expected unknown-provider error, got %v", err)
	}
}

// The action provider supplies tools, and they arrive on the agent (guarded, name preserved).
func TestBuildResolvesActionProviderTools(t *testing.T) {
	s := &spec.AgentSpec{
		Name:     "WithTools",
		Action:   spec.ActionSpec{MCPURL: "https://x/mcp", Provider: "demo"},
		Channels: []spec.ChannelSpec{{Type: "a2a"}},
	}
	a, err := Build(context.Background(), s)
	if err != nil {
		t.Fatalf("build: %v", err)
	}
	if len(a.Tools) != 1 || a.Tools[0].Name() != "echo" {
		t.Fatalf("expected one guarded echo tool, got %v", a.Tools)
	}
}

// A turn emits exactly one TurnTrace with the model, output, and per-step spans.
func TestAgentEmitsTrace(t *testing.T) {
	s, err := spec.Load("../examples/zomato.json")
	if err != nil {
		t.Fatal(err)
	}
	a, err := Build(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	rec := observability.NewRecorder()
	a.Observer = rec

	if _, err := a.Handle(context.Background(), core.Turn{ChannelUserID: "u1", Text: "hi"}); err != nil {
		t.Fatal(err)
	}
	recs := rec.Records()
	if len(recs) != 1 {
		t.Fatalf("expected exactly one trace, got %d", len(recs))
	}
	tr := recs[0]
	if tr.Model != "echo" || tr.Output == "" || len(tr.Spans) == 0 {
		t.Fatalf("trace missing model/output/spans: %+v", tr)
	}
}
