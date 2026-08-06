package memory

import (
	"testing"

	"github.com/TheAgent-net/webagent/conformance"
)

// The built-in session provider must pass the memory conformance kit — the same bar every
// partner memory adapter has to clear (round-trip + scope isolation).
func TestSessionMemoryConformance(t *testing.T) {
	m, err := Registry.Get("session", nil)
	if err != nil {
		t.Fatal(err)
	}
	conformance.Memory(t, m)
}

// The default resolves via an empty pick.
func TestMemoryDefault(t *testing.T) {
	m, err := Registry.Get("", nil)
	if err != nil {
		t.Fatal(err)
	}
	if m.Name() != "session" {
		t.Fatalf("default memory should be session, got %s", m.Name())
	}
}
