package build

import (
	"context"
	"strings"
	"testing"

	"github.com/TheAgent-net/webagent/secrets"
	"github.com/TheAgent-net/webagent/spec"
)

// A spec names secrets; the vault supplies the values at build time. Here a live Slack channel
// is configured entirely through "<name>Secret" references — no credential appears in the spec.
func TestBuildResolvesChannelSecretsFromVault(t *testing.T) {
	vault := secrets.NewStatic(map[string]map[string]string{
		"Acme": {
			"SLACK_BOT_TOKEN":      "xoxb-from-vault",
			"SLACK_SIGNING_SECRET": "signing-from-vault",
		},
	})
	s := &spec.AgentSpec{
		Name: "Acme",
		Channels: []spec.ChannelSpec{{
			Type:      "slack",
			Presenter: "text",
			Config: map[string]any{
				"addr":                ":0",
				"botTokenSecret":      "SLACK_BOT_TOKEN",
				"signingSecretSecret": "SLACK_SIGNING_SECRET",
			},
		}},
	}

	a, err := Build(context.Background(), s, WithSecrets(vault))
	if err != nil {
		t.Fatalf("build with vault-resolved secrets: %v", err)
	}
	if len(a.Bindings) != 1 || a.Bindings[0].Channel.Name() != "slack" {
		t.Fatalf("slack channel not built: %+v", a.Bindings)
	}
	// The spec itself still holds only references, never the values.
	cfg := s.Channels[0].Config
	if cfg["botTokenSecret"] != "SLACK_BOT_TOKEN" || cfg["botToken"] != nil {
		t.Fatalf("spec must keep references, not resolved values: %+v", cfg)
	}
}

// An unresolvable reference fails the build rather than silently starting a channel with no
// credential.
func TestBuildFailsOnMissingSecret(t *testing.T) {
	vault := secrets.NewStatic(nil)
	s := &spec.AgentSpec{
		Name: "Acme",
		Channels: []spec.ChannelSpec{{
			Type:   "slack",
			Config: map[string]any{"botTokenSecret": "ABSENT", "signingSecretSecret": "ALSO_ABSENT"},
		}},
	}
	_, err := Build(context.Background(), s, WithSecrets(vault))
	if err == nil {
		t.Fatal("expected the build to fail when a secret cannot be resolved")
	}
	if !strings.Contains(err.Error(), "ABSENT") {
		t.Fatalf("error should name the missing secret, got %v", err)
	}
}

// A secret reference must name a key (a non-empty string).
func TestBuildRejectsMalformedSecretReference(t *testing.T) {
	s := &spec.AgentSpec{
		Name:     "Acme",
		Model:    spec.ComponentSpec{Type: "echo", Config: map[string]any{"apiKeySecret": 42}},
		Channels: []spec.ChannelSpec{{Type: "web"}},
	}
	if _, err := Build(context.Background(), s, WithSecrets(secrets.NewStatic(nil))); err == nil {
		t.Fatal("expected an error for a non-string secret reference")
	}
}
