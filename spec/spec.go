// Package spec is the declarative template a business fills in — the picks that compose an
// agent. A business describes what they are, points at their MCP (the action layer), then
// picks one provider per slot from the menu. Empty picks resolve to slot defaults at build
// time, so a minimal spec still yields a working agent.
package spec

import (
	"encoding/json"
	"fmt"
	"os"
)

// SchemaVersion is the current spec contract version. Bumped on breaking changes; specs
// carry their own version so old specs can be migrated.
const SchemaVersion = "1"

// AgentSpec is one business's complete web-agent definition.
type AgentSpec struct {
	SchemaVersion string        `json:"schemaVersion"`
	Name          string        `json:"name"`
	Business      string        `json:"business"`
	Instruction   string        `json:"instruction"`
	Brand         Brand         `json:"brand"`
	Action        ActionSpec    `json:"action"`
	Retrieval     ComponentSpec `json:"retrieval"`
	Memory        ComponentSpec `json:"memory"`
	Guardrail     ComponentSpec `json:"guardrail"`
	Channels      []ChannelSpec `json:"channels"`
}

// Brand carries presentation identity a business wants reflected in rendered UI.
type Brand struct {
	PrimaryColor string `json:"primaryColor"`
	Logo         string `json:"logo"`
}

// ActionSpec points at the business's MCP server (the grounded capability layer).
type ActionSpec struct {
	MCPURL      string `json:"mcpUrl"`
	AuthBaseURL string `json:"authBaseUrl"`
}

// ComponentSpec picks a provider for a slot by name and hands it opaque config. An empty
// Type resolves to the slot's default provider at build time.
type ComponentSpec struct {
	Type   string         `json:"type"`
	Config map[string]any `json:"config"`
}

// ChannelSpec picks a channel plus the presenter used to render replies on it.
type ChannelSpec struct {
	Type      string         `json:"type"`
	Presenter string         `json:"presenter"`
	Config    map[string]any `json:"config"`
}

// Load reads and structurally validates a spec from a JSON file.
func Load(path string) (*AgentSpec, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var s AgentSpec
	if err := json.Unmarshal(b, &s); err != nil {
		return nil, fmt.Errorf("parse spec: %w", err)
	}
	if err := s.Validate(); err != nil {
		return nil, err
	}
	return &s, nil
}

// Validate checks the spec is structurally complete. Whether the named providers exist in
// the registries is checked at build time (which owns the registries), keeping this package
// dependency-free. Slot picks may be empty — they resolve to defaults at build.
func (s *AgentSpec) Validate() error {
	if s.SchemaVersion != "" && s.SchemaVersion != SchemaVersion {
		return fmt.Errorf("spec %q: unsupported schemaVersion %q (want %q)", s.Name, s.SchemaVersion, SchemaVersion)
	}
	if s.Name == "" {
		return fmt.Errorf("spec: name is required")
	}
	if s.Action.MCPURL == "" {
		return fmt.Errorf("spec %q: action.mcpUrl is required", s.Name)
	}
	if len(s.Channels) == 0 {
		return fmt.Errorf("spec %q: at least one channel is required", s.Name)
	}
	for i, c := range s.Channels {
		if c.Type == "" {
			return fmt.Errorf("spec %q: channels[%d].type is required", s.Name, i)
		}
	}
	return nil
}
