// Package channels is the channel slot: the menu of transport options. A Channel receives
// user turns and sends back rendered payloads via the Dispatch it is given at Start. a2a
// and web are runnable HTTP channels; the messaging channels are registered stubs that
// report "not configured" until a platform adapter + credentials are wired.
package channels

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spi"
)

// ErrNotConfigured is returned by a stub channel that has no live adapter yet.
var ErrNotConfigured = errors.New("channel not configured")

// Registry is the channel slot.
var Registry = spi.New[core.Channel]("channel")

func init() {
	Registry.Register(spi.Descriptor{Name: "a2a", Summary: "agent-to-agent HTTP endpoint (marketplace)"}, newHTTP("a2a", ":8787", "/a2a"))
	Registry.Register(spi.Descriptor{Name: "web", Summary: "website widget HTTP endpoint"}, newHTTP("web", ":9090", "/chat"))
	Registry.Register(spi.Descriptor{Name: "whatsapp", Summary: "WhatsApp (stub until adapter + credentials)"}, newStub("whatsapp"))
	Registry.Register(spi.Descriptor{Name: "telegram", Summary: "Telegram (stub until adapter + credentials)"}, newStub("telegram"))
	Registry.Register(spi.Descriptor{Name: "slack", Summary: "Slack (stub until adapter + credentials)"}, newStub("slack"))
	Registry.SetDefault("a2a")
}

// --- httpChannel: a minimal request/response channel. POST {user,text} -> rendered payload. ---

type httpChannel struct {
	name string
	addr string
	path string
}

func newHTTP(name, defAddr, path string) spi.Constructor[core.Channel] {
	return func(cfg map[string]any) (core.Channel, error) {
		var c struct {
			Addr string `json:"addr"`
		}
		if err := core.Decode(cfg, &c); err != nil {
			return nil, err
		}
		if c.Addr == "" {
			c.Addr = defAddr
		}
		return &httpChannel{name: name, addr: c.Addr, path: path}, nil
	}
}

func (h *httpChannel) Name() string { return h.name }

func (h *httpChannel) Start(ctx context.Context, dispatch core.Dispatch) error {
	mux := http.NewServeMux()
	mux.HandleFunc(h.path, func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			User string `json:"user"`
			Text string `json:"text"`
		}
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		out, err := dispatch(r.Context(), core.Turn{ChannelUserID: in.User, Text: in.Text})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", out.ContentType)
		_, _ = w.Write([]byte(out.Body))
	})
	srv := &http.Server{Addr: h.addr, Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go func() { <-ctx.Done(); _ = srv.Close() }()
	log.Printf("channel %s listening on %s%s", h.name, h.addr, h.path)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// --- stub: a selectable-but-inert channel; replace with a real adapter to activate. ---

type stub struct{ name string }

func newStub(name string) spi.Constructor[core.Channel] {
	return func(map[string]any) (core.Channel, error) { return &stub{name: name}, nil }
}

func (s *stub) Name() string { return s.name }

func (s *stub) Start(context.Context, core.Dispatch) error {
	log.Printf("channel %s: registered but %v — add credentials + adapter to activate", s.name, ErrNotConfigured)
	return nil
}
