// Package retrieval is the retrieval slot: the menu of knowledge/discovery providers.
// Built-ins live here; partner providers register their own adapters into Registry.
package retrieval

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spi"
)

// Registry is the retrieval slot. A spec selects a provider by name from it.
var Registry = spi.New[core.Retriever]("retrieval")

func init() {
	Registry.Register(spi.Descriptor{
		Name:    "live",
		Summary: "no local index; discovery defers to the MCP's own search",
	}, newLive)
	Registry.Register(spi.Descriptor{
		Name:    "keyword",
		Summary: "in-memory BM25-lite term scoring over a supplied corpus",
	}, newKeyword)
	Registry.Register(spi.Descriptor{
		Name:         "hybrid",
		Summary:      "BM25 + dense + rerank (degrades to keyword until a vector backend is configured)",
		Capabilities: spi.Capabilities{"vector": false, "rerank": false},
	}, newHybrid)
	Registry.SetDefault("live")
}

// --- live: cheapest option; the brain uses the live MCP search tools directly. ---

type live struct{}

func newLive(map[string]any) (core.Retriever, error) { return live{}, nil }
func (live) Name() string                            { return "live" }
func (live) Retrieve(context.Context, core.Query, int) ([]core.Candidate, error) {
	return nil, nil
}

// --- keyword: term-overlap scoring over a supplied corpus. ---

type corpusItem struct {
	ID    string            `json:"id"`
	Title string            `json:"title"`
	Text  string            `json:"text"`
	Attrs map[string]string `json:"attrs"`
}

type keyword struct{ items []corpusItem }

func newKeyword(cfg map[string]any) (core.Retriever, error) {
	var c struct {
		Corpus []corpusItem `json:"corpus"`
	}
	if err := core.Decode(cfg, &c); err != nil {
		return nil, fmt.Errorf("keyword retriever config: %w", err)
	}
	return &keyword{items: c.Corpus}, nil
}

func (k *keyword) Name() string { return "keyword" }

func (k *keyword) Retrieve(_ context.Context, q core.Query, top int) ([]core.Candidate, error) {
	terms := strings.Fields(strings.ToLower(q.Text))
	var out []core.Candidate
	for _, it := range k.items {
		hay := strings.ToLower(it.Title + " " + it.Text)
		var score float64
		for _, t := range terms {
			if strings.Contains(hay, t) {
				score++
			}
		}
		if score == 0 {
			continue
		}
		out = append(out, core.Candidate{
			ID: it.ID, Title: it.Title, Text: it.Text, Attrs: it.Attrs,
			Score: score / float64(len(terms)),
		})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	if top > 0 && len(out) > top {
		out = out[:top]
	}
	return out, nil
}

// --- hybrid: registered slot for BM25 + dense + rerank; degrades to keyword until a
// vector backend is configured, so specs can select "hybrid" today. ---

type hybrid struct{ core.Retriever }

func newHybrid(cfg map[string]any) (core.Retriever, error) {
	kw, err := newKeyword(cfg)
	if err != nil {
		return nil, err
	}
	return &hybrid{Retriever: kw}, nil
}

func (h *hybrid) Name() string { return "hybrid" }

// Capabilities advertises what this instance actually supports at runtime (capability
// negotiation). Until a vector backend is wired, the rich paths are off.
func (h *hybrid) Capabilities() spi.Capabilities {
	return spi.Capabilities{"vector": false, "rerank": false}
}
