package present

import (
	"strings"
	"testing"

	"github.com/TheAgent-net/webagent/core"
)

// The per-channel rendering payoff: one message with a payment URL renders as a scannable
// QR on the terminal, but as a plain labeled link on text channels.
func TestTerminalRendersQRButTextDoesNot(t *testing.T) {
	msg := core.AgentMessage{
		Text:     "Order placed. Scan to pay 332.58.",
		Elements: []core.Element{{Kind: core.ElementQR, Label: "pay", Value: "https://pay.example.com/p?pid=abc123"}},
	}

	term, _ := Registry.Get("terminal", nil)
	out := term.Render(msg)
	if !strings.Contains(out.Body, "█") {
		t.Fatal("terminal presenter should render a scannable QR")
	}
	if !strings.Contains(out.Body, "pid=abc123") {
		t.Fatal("payment URL should still be present under the QR")
	}

	txt, _ := Registry.Get("text", nil)
	tout := txt.Render(msg)
	if strings.Contains(tout.Body, "█") {
		t.Fatal("text presenter must NOT emit QR art")
	}
	if !strings.Contains(tout.Body, "pid=abc123") {
		t.Fatal("text presenter should still surface the payment link")
	}
}

func TestWebPresenterEmitsJSON(t *testing.T) {
	p, _ := Registry.Get("web", nil)
	out := p.Render(core.AgentMessage{Text: "hi", Elements: []core.Element{{Kind: core.ElementButton, Label: "Order", Value: "order"}}})
	if out.ContentType != "application/json" {
		t.Fatalf("want application/json, got %s", out.ContentType)
	}
	if !strings.Contains(out.Body, "\"button\"") || !strings.Contains(out.Body, "\"Order\"") {
		t.Fatalf("web payload missing element: %s", out.Body)
	}
}

// The default presenter resolves via an empty pick.
func TestPresenterDefault(t *testing.T) {
	p, err := Registry.Get("", nil)
	if err != nil {
		t.Fatal(err)
	}
	if p.Name() != "text" {
		t.Fatalf("default presenter should be text, got %s", p.Name())
	}
}
