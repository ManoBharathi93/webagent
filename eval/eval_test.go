package eval

import (
	"context"
	"testing"

	"github.com/TheAgent-net/webagent/brain"
	"github.com/TheAgent-net/webagent/core"
)

func TestRunScoresScenarios(t *testing.T) {
	a := &core.Agent{Brain: brain.Echo{}}
	scenarios := []Scenario{
		{Name: "echoes input", Input: "hello world", Checks: []Check{NoError(), Contains("hello world")}},
		{Name: "should fail", Input: "hi", Checks: []Check{Contains("absent-token-xyz")}},
	}
	rep := Run(context.Background(), a, scenarios)

	if rep.Passed != 1 || rep.Failed != 1 {
		t.Fatalf("expected 1 pass / 1 fail, got %s", rep.Summary())
	}
	if rep.OK() {
		t.Fatal("report should not be OK when a scenario fails")
	}
	if len(rep.Results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(rep.Results))
	}
	// The failing scenario records the specific check failure.
	if rep.Results[1].Pass || len(rep.Results[1].Failures) == 0 {
		t.Fatalf("failing scenario should record failures: %+v", rep.Results[1])
	}
}

func TestChecksIndividually(t *testing.T) {
	msg := core.AgentMessage{Text: "hello there"}
	if err := Contains("hello")(msg, core.TurnTrace{}, nil); err != nil {
		t.Fatalf("Contains should pass: %v", err)
	}
	if err := NotContains("zzz")(msg, core.TurnTrace{}, nil); err != nil {
		t.Fatalf("NotContains should pass: %v", err)
	}
	if err := Blocked()(msg, core.TurnTrace{Blocked: true}, nil); err != nil {
		t.Fatalf("Blocked should pass when trace is blocked: %v", err)
	}
	if err := Blocked()(msg, core.TurnTrace{Blocked: false}, nil); err == nil {
		t.Fatal("Blocked should fail when trace is not blocked")
	}
}
