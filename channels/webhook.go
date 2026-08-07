package channels

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"time"
)

// serveHTTP runs h on addr until ctx is done. Shared by every webhook-style channel.
func serveHTTP(ctx context.Context, addr string, h http.Handler) error {
	srv := &http.Server{Addr: addr, Handler: h, ReadHeaderTimeout: 10 * time.Second}
	go func() { <-ctx.Done(); _ = srv.Close() }()
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// dedupe remembers recently-seen delivery ids. Both Slack and Meta retry a webhook until it is
// acknowledged, and a retry that slips through would make the agent answer twice — and, worse,
// act twice. Bounded so it cannot grow without limit.
type dedupe struct {
	mu    sync.Mutex
	seen  map[string]struct{}
	order []string
	max   int
}

func newDedupe(max int) *dedupe {
	if max <= 0 {
		max = 1024
	}
	return &dedupe{seen: make(map[string]struct{}, max), max: max}
}

// firstTime reports whether id has not been seen before, recording it. An empty id is always
// treated as new (nothing to deduplicate on).
func (d *dedupe) firstTime(id string) bool {
	if id == "" {
		return true
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if _, dup := d.seen[id]; dup {
		return false
	}
	d.seen[id] = struct{}{}
	d.order = append(d.order, id)
	if len(d.order) > d.max {
		delete(d.seen, d.order[0])
		d.order = d.order[1:]
	}
	return true
}
