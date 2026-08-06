// Package present is the presenter slot: the menu of rendering options. A Presenter lowers
// one channel-agnostic AgentMessage into a channel's native format — where per-channel
// rendering fidelity lives (e.g. a payment QR renders differently per channel).
package present

import (
	"encoding/json"
	"fmt"
	"strings"

	qrcode "github.com/skip2/go-qrcode"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spi"
)

// Registry is the presenter slot.
var Registry = spi.New[core.Presenter]("presenter")

func init() {
	Registry.Register(spi.Descriptor{Name: "text", Summary: "plain text; the universal fallback"},
		func(map[string]any) (core.Presenter, error) { return text{}, nil })
	Registry.Register(spi.Descriptor{Name: "terminal", Summary: "renders QR elements as scannable unicode art"},
		func(map[string]any) (core.Presenter, error) { return terminal{}, nil })
	Registry.Register(spi.Descriptor{Name: "web", Summary: "structured JSON payload for an embeddable widget"},
		func(map[string]any) (core.Presenter, error) { return web{}, nil })
	Registry.SetDefault("text")
}

// --- text: flatten everything to plain text. ---

type text struct{}

func (text) Name() string { return "text" }

func (text) Render(m core.AgentMessage) core.Payload {
	var b strings.Builder
	b.WriteString(m.Text)
	for _, e := range m.Elements {
		switch e.Kind {
		case core.ElementQR, core.ElementLink, core.ElementImage:
			fmt.Fprintf(&b, "\n%s: %s", label(e, "link"), e.Value)
		case core.ElementButton:
			fmt.Fprintf(&b, "\n[%s]", label(e, "button"))
		}
	}
	return core.Payload{ContentType: "text/plain", Body: b.String()}
}

// --- terminal: render a QR element as scannable unicode art (the QR problem, solved). ---

type terminal struct{}

func (terminal) Name() string { return "terminal" }

func (terminal) Render(m core.AgentMessage) core.Payload {
	var b strings.Builder
	b.WriteString(m.Text)
	for _, e := range m.Elements {
		switch e.Kind {
		case core.ElementQR:
			if art, err := renderQR(e.Value); err == nil {
				fmt.Fprintf(&b, "\n\n%s\n%s", art, e.Value)
			} else {
				fmt.Fprintf(&b, "\n%s: %s", label(e, "pay"), e.Value)
			}
		case core.ElementLink, core.ElementImage:
			fmt.Fprintf(&b, "\n%s: %s", label(e, "link"), e.Value)
		case core.ElementButton:
			fmt.Fprintf(&b, "\n[%s]", label(e, "button"))
		}
	}
	return core.Payload{ContentType: "text/plain", Body: b.String()}
}

func renderQR(value string) (string, error) {
	q, err := qrcode.New(value, qrcode.Medium)
	if err != nil {
		return "", err
	}
	return q.ToSmallString(false), nil
}

// --- web: structured JSON payload for an embeddable site widget. ---

type web struct{}

func (web) Name() string { return "web" }

func (web) Render(m core.AgentMessage) core.Payload {
	type el struct {
		Kind  string `json:"kind"`
		Label string `json:"label,omitempty"`
		Value string `json:"value,omitempty"`
	}
	payload := struct {
		Text     string `json:"text"`
		Elements []el   `json:"elements,omitempty"`
	}{Text: m.Text}
	for _, e := range m.Elements {
		payload.Elements = append(payload.Elements, el{Kind: string(e.Kind), Label: e.Label, Value: e.Value})
	}
	b, _ := json.Marshal(payload)
	return core.Payload{ContentType: "application/json", Body: string(b)}
}

func label(e core.Element, fallback string) string {
	if e.Label != "" {
		return e.Label
	}
	return fallback
}
