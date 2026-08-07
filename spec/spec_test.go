package spec

import (
	"encoding/json"
	"testing"
)

func TestLoadValidExample(t *testing.T) {
	s, err := Load("../examples/zomato.json")
	if err != nil {
		t.Fatal(err)
	}
	if s.Name == "" || s.Action.MCPURL == "" || len(s.Channels) == 0 {
		t.Fatalf("expected a populated spec, got %+v", s)
	}
}

func TestValidate(t *testing.T) {
	valid := func() *AgentSpec {
		return &AgentSpec{
			Name:     "X",
			Action:   ActionSpec{MCPURL: "https://x/mcp"},
			Channels: []ChannelSpec{{Type: "a2a"}},
		}
	}
	if err := valid().Validate(); err != nil {
		t.Fatalf("a valid spec should pass: %v", err)
	}

	cases := map[string]func(*AgentSpec){
		"missing name":      func(s *AgentSpec) { s.Name = "" },
		"missing mcpUrl":    func(s *AgentSpec) { s.Action.MCPURL = "" },
		"no channels":       func(s *AgentSpec) { s.Channels = nil },
		"channel no type":   func(s *AgentSpec) { s.Channels = []ChannelSpec{{Presenter: "text"}} },
		"bad schemaVersion": func(s *AgentSpec) { s.SchemaVersion = "999" },
	}
	for name, mutate := range cases {
		s := valid()
		mutate(s)
		if err := s.Validate(); err == nil {
			t.Fatalf("%s: expected a validation error", name)
		}
	}
}

// FuzzSpec ensures arbitrary bytes never panic the parser or the validator.
func FuzzSpec(f *testing.F) {
	f.Add([]byte(`{"name":"x","action":{"mcpUrl":"y"},"channels":[{"type":"a2a"}]}`))
	f.Add([]byte(`{`))
	f.Add([]byte(``))
	f.Add([]byte(`{"channels": 5}`))
	f.Fuzz(func(t *testing.T, data []byte) {
		var s AgentSpec
		_ = json.Unmarshal(data, &s) // must not panic
		_ = s.Validate()             // must not panic
	})
}
