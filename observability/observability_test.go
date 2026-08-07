package observability

import (
	"context"
	"testing"

	"github.com/TheAgent-net/webagent/core"
)

func TestRecorderCapturesTraces(t *testing.T) {
	r := NewRecorder()
	r.Observe(context.Background(), core.TurnTrace{Model: "echo", Output: "hi"})
	r.Observe(context.Background(), core.TurnTrace{Model: "echo", Output: "bye"})
	recs := r.Records()
	if len(recs) != 2 {
		t.Fatalf("expected 2 records, got %d", len(recs))
	}
	if recs[0].Model != "echo" || recs[1].Output != "bye" {
		t.Fatalf("unexpected records: %+v", recs)
	}
}

func TestDefaultIsNone(t *testing.T) {
	o, err := Registry.Get("", nil)
	if err != nil {
		t.Fatal(err)
	}
	if o.Name() != "none" {
		t.Fatalf("default observability should be none, got %s", o.Name())
	}
}

func TestLogObserverDoesNotPanic(t *testing.T) {
	o, err := Registry.Get("log", nil)
	if err != nil {
		t.Fatal(err)
	}
	// Should serialize and emit without error.
	o.Observe(context.Background(), core.TurnTrace{Model: "echo", Spans: []core.Span{{Name: "reason"}}})
}
