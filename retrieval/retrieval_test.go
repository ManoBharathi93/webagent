package retrieval

import (
	"testing"

	"github.com/TheAgent-net/webagent/conformance"
)

// Every built-in retriever must pass the retrieval conformance kit.
func TestBuiltinRetrieversConformance(t *testing.T) {
	for _, name := range []string{"live", "keyword", "hybrid"} {
		r, err := Registry.Get(name, nil)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		conformance.Retriever(t, r)
	}
}
