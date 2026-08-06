// Package memory is the memory slot: per-user, cross-session memory. This is a
// partner-provided slot — collaborating companies register their adapters here. The
// built-in "session" provider is the zero-config default and the fallback if a partner
// provider is unavailable, so an agent always has working memory.
package memory

import (
	"context"
	"strings"
	"sync"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spi"
)

// Registry is the memory slot.
var Registry = spi.New[core.Memory]("memory")

func init() {
	Registry.Register(spi.Descriptor{
		Name:    "session",
		Summary: "built-in in-process memory scoped per user/session (zero-config default + fallback)",
	}, newSession)
	Registry.SetDefault("session")
}

// session is a minimal, scope-isolated, in-process memory. Real partner providers add
// durable storage, embeddings, cross-session recall, and contradiction handling.
type session struct {
	mu    sync.Mutex
	store map[string][]core.MemoryItem
}

func newSession(map[string]any) (core.Memory, error) {
	return &session{store: map[string][]core.MemoryItem{}}, nil
}

func (s *session) Name() string { return "session" }

func key(sc core.Scope) string { return sc.AgentID + "|" + sc.UserID + "|" + sc.SessionID }

func (s *session) Remember(_ context.Context, sc core.Scope, items []core.MemoryItem) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	k := key(sc)
	s.store[k] = append(s.store[k], items...)
	return nil
}

func (s *session) Recall(_ context.Context, sc core.Scope, query string, top int) ([]core.MemoryItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	all := s.store[key(sc)]
	q := strings.ToLower(query)
	out := make([]core.MemoryItem, 0, len(all))
	// most-recent-first, with a light relevance boost for substring matches
	for i := len(all) - 1; i >= 0; i-- {
		it := all[i]
		it.Score = 1
		if q != "" && strings.Contains(strings.ToLower(it.Text), q) {
			it.Score = 2
		}
		out = append(out, it)
		if top > 0 && len(out) >= top {
			break
		}
	}
	return out, nil
}
