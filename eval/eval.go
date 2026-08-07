// Package eval is the evaluation harness: run scenarios against an agent and score them. A
// Scenario is an input plus a set of Checks; Run executes each against the agent and returns
// a Report. Shipping evals from day one lets a business test an agent before it goes live and
// catch regressions after — the other half of the toy-to-production gap.
package eval

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/TheAgent-net/webagent/core"
)

// Check validates one turn's outcome. It receives the reply, the turn trace, and any error,
// and returns a non-nil error describing the failure.
type Check func(res core.AgentMessage, tr core.TurnTrace, err error) error

// NoError asserts the turn did not error.
func NoError() Check {
	return func(_ core.AgentMessage, _ core.TurnTrace, err error) error {
		if err != nil {
			return fmt.Errorf("unexpected error: %v", err)
		}
		return nil
	}
}

// Contains asserts the reply contains sub.
func Contains(sub string) Check {
	return func(res core.AgentMessage, _ core.TurnTrace, _ error) error {
		if !strings.Contains(res.Text, sub) {
			return fmt.Errorf("reply does not contain %q", sub)
		}
		return nil
	}
}

// NotContains asserts the reply does not contain sub.
func NotContains(sub string) Check {
	return func(res core.AgentMessage, _ core.TurnTrace, _ error) error {
		if strings.Contains(res.Text, sub) {
			return fmt.Errorf("reply unexpectedly contains %q", sub)
		}
		return nil
	}
}

// Blocked asserts a guardrail blocked the turn (uses the turn trace).
func Blocked() Check {
	return func(_ core.AgentMessage, tr core.TurnTrace, _ error) error {
		if !tr.Blocked {
			return fmt.Errorf("expected the turn to be blocked by a guardrail")
		}
		return nil
	}
}

// Scenario is one evaluation case.
type Scenario struct {
	Name   string
	User   string
	Input  string
	Checks []Check
}

// Result is the outcome for one scenario.
type Result struct {
	Scenario string
	Pass     bool
	Failures []string
	Latency  time.Duration
}

// Report aggregates scenario results.
type Report struct {
	Results []Result
	Passed  int
	Failed  int
}

// OK reports whether every scenario passed.
func (r Report) OK() bool { return r.Failed == 0 }

// Summary is a one-line pass/fail count.
func (r Report) Summary() string { return fmt.Sprintf("passed %d, failed %d", r.Passed, r.Failed) }

// capture is a throwaway Observer that keeps the most recent trace so checks can assert on
// it. Run installs it for the run and restores the agent's prior observer afterward.
type capture struct{ last core.TurnTrace }

func (*capture) Name() string                                  { return "eval-capture" }
func (c *capture) Observe(_ context.Context, t core.TurnTrace) { c.last = t }

// Run executes each scenario against the agent and returns a Report. Scenarios run
// sequentially (they share the agent). Intended for offline evaluation, not live serving.
func Run(ctx context.Context, a *core.Agent, scenarios []Scenario) Report {
	capt := &capture{}
	prev := a.Observer
	a.Observer = capt
	defer func() { a.Observer = prev }()

	var rep Report
	for _, sc := range scenarios {
		capt.last = core.TurnTrace{}
		start := time.Now()
		res, err := a.Handle(ctx, core.Turn{ChannelUserID: sc.User, Text: sc.Input})
		lat := time.Since(start)

		var failures []string
		for _, c := range sc.Checks {
			if e := c(res, capt.last, err); e != nil {
				failures = append(failures, e.Error())
			}
		}
		r := Result{Scenario: sc.Name, Pass: len(failures) == 0, Failures: failures, Latency: lat}
		if r.Pass {
			rep.Passed++
		} else {
			rep.Failed++
		}
		rep.Results = append(rep.Results, r)
	}
	return rep
}
