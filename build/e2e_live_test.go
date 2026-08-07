package build_test

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/TheAgent-net/webagent/build"
	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spec"
)

// Live end-to-end: mock MCP + mock OpenAI-compatible gateway that issues a tool call,
// then Agent.Handle must run the MCP tool (guarded) and return the model's final text.
func TestLiveMCPAndToolCallingBrain(t *testing.T) {
	const session = "e2e-session"
	var mcpCalls atomic.Int32

	mcp := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID     json.RawMessage `json:"id"`
			Method string          `json:"method"`
			Params json.RawMessage `json:"params"`
		}
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &req)
		if len(req.ID) == 0 {
			w.WriteHeader(http.StatusAccepted)
			return
		}
		if req.Method != "initialize" && r.Header.Get("Mcp-Session-Id") != session {
			http.Error(w, "missing session", http.StatusBadRequest)
			return
		}
		write := func(result any) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": req.ID, "result": result})
		}
		switch req.Method {
		case "initialize":
			w.Header().Set("Mcp-Session-Id", session)
			write(map[string]any{
				"protocolVersion": "2025-06-18",
				"capabilities":    map[string]any{"tools": map[string]any{}},
				"serverInfo":      map[string]any{"name": "e2e-mcp", "version": "1"},
			})
		case "tools/list":
			write(map[string]any{"tools": []map[string]any{{
				"name":        "lookup_restaurant",
				"description": "look up a restaurant by name",
				"inputSchema": map[string]any{
					"type":       "object",
					"properties": map[string]any{"name": map[string]any{"type": "string"}},
				},
			}}})
		case "tools/call":
			mcpCalls.Add(1)
			var p struct {
				Name      string         `json:"name"`
				Arguments map[string]any `json:"arguments"`
			}
			_ = json.Unmarshal(req.Params, &p)
			write(map[string]any{
				"content": []map[string]any{{
					"type": "text",
					"text": fmt.Sprintf("Found %v: open, biryani from 249", p.Arguments["name"]),
				}},
				"isError": false,
			})
		default:
			http.Error(w, "bad method", http.StatusBadRequest)
		}
	}))
	defer mcp.Close()

	var llmSteps atomic.Int32
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/chat/completions") {
			http.NotFound(w, r)
			return
		}
		step := llmSteps.Add(1)
		w.Header().Set("Content-Type", "application/json")
		if step == 1 {
			// First turn: model requests a tool call.
			_ = json.NewEncoder(w).Encode(map[string]any{
				"choices": []map[string]any{{
					"message": map[string]any{
						"role": "assistant",
						"tool_calls": []map[string]any{{
							"id":   "call_1",
							"type": "function",
							"function": map[string]any{
								"name":      "lookup_restaurant",
								"arguments": `{"name":"Paradise"}`,
							},
						}},
					},
				}},
			})
			return
		}
		// Second turn: model answers from the tool result.
		var body struct {
			Messages []map[string]any `json:"messages"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		sawTool := false
		for _, m := range body.Messages {
			if m["role"] == "tool" {
				sawTool = true
				content, _ := m["content"].(string)
				if !strings.Contains(content, "Paradise") {
					t.Errorf("tool result not fed back to model: %v", m["content"])
				}
			}
		}
		if !sawTool {
			t.Error("second LLM call missing tool role message")
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{{
				"message": map[string]any{
					"role":    "assistant",
					"content": "Paradise is open — biryani from 249. Shall I place an order?",
				},
			}},
		})
	}))
	defer llm.Close()

	t.Setenv("E2E_LLM_KEY", "test-key")
	s := &spec.AgentSpec{
		Name:        "E2E Concierge",
		Business:    "test",
		Instruction: "Use tools for facts. Confirm before checkout.",
		Action:      spec.ActionSpec{Provider: "mcp", MCPURL: mcp.URL},
		Model: spec.ComponentSpec{
			Type: "gateway",
			Config: map[string]any{
				"baseUrl":   llm.URL + "/v1",
				"model":     "test-model",
				"apiKeyEnv": "E2E_LLM_KEY",
			},
		},
		Channels: []spec.ChannelSpec{{Type: "a2a", Presenter: "text", Config: map[string]any{"addr": ":0"}}},
	}

	a, err := build.Build(context.Background(), s)
	if err != nil {
		t.Fatalf("build: %v", err)
	}
	if len(a.Tools) != 1 || a.Tools[0].Name() != "lookup_restaurant" {
		t.Fatalf("expected guarded MCP tool, got %#v", a.Tools)
	}

	msg, err := a.Handle(context.Background(), core.Turn{ChannelUserID: "u1", Text: "Find Paradise biryani"})
	if err != nil {
		t.Fatalf("handle: %v", err)
	}
	if mcpCalls.Load() != 1 {
		t.Fatalf("expected 1 MCP tools/call, got %d", mcpCalls.Load())
	}
	if llmSteps.Load() != 2 {
		t.Fatalf("expected 2 LLM rounds, got %d", llmSteps.Load())
	}
	if !strings.Contains(msg.Text, "Paradise") || !strings.Contains(msg.Text, "249") {
		t.Fatalf("unexpected final reply: %q", msg.Text)
	}
}

// Guardrail must block a dangerous MCP tool name before the server is called.
func TestLiveMCPGuardrailBlocksDangerousTool(t *testing.T) {
	const session = "guard-session"
	var mcpCalls atomic.Int32
	mcp := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ID     json.RawMessage `json:"id"`
			Method string          `json:"method"`
		}
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &req)
		if len(req.ID) == 0 {
			w.WriteHeader(http.StatusAccepted)
			return
		}
		if req.Method != "initialize" && r.Header.Get("Mcp-Session-Id") != session {
			http.Error(w, "missing session", http.StatusBadRequest)
			return
		}
		write := func(result any) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": req.ID, "result": result})
		}
		switch req.Method {
		case "initialize":
			w.Header().Set("Mcp-Session-Id", session)
			write(map[string]any{"protocolVersion": "2025-06-18", "capabilities": map[string]any{}, "serverInfo": map[string]any{"name": "g"}})
		case "tools/list":
			write(map[string]any{"tools": []map[string]any{{
				"name":        "transfer_funds",
				"description": "move money",
				"inputSchema": map[string]any{"type": "object"},
			}}})
		case "tools/call":
			mcpCalls.Add(1)
			write(map[string]any{"content": []map[string]any{{"type": "text", "text": "transferred"}}, "isError": false})
		}
	}))
	defer mcp.Close()

	var llmSteps atomic.Int32
	llm := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		step := llmSteps.Add(1)
		w.Header().Set("Content-Type", "application/json")
		if step == 1 {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"choices": []map[string]any{{
					"message": map[string]any{
						"role": "assistant",
						"tool_calls": []map[string]any{{
							"id":   "call_x",
							"type": "function",
							"function": map[string]any{
								"name":      "transfer_funds",
								"arguments": `{}`,
							},
						}},
					},
				}},
			})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{{
				"message": map[string]any{"role": "assistant", "content": "I cannot transfer funds."},
			}},
		})
	}))
	defer llm.Close()

	t.Setenv("E2E_LLM_KEY", "test-key")
	s := &spec.AgentSpec{
		Name:     "Safe",
		Action:   spec.ActionSpec{Provider: "mcp", MCPURL: mcp.URL},
		Model:    spec.ComponentSpec{Type: "gateway", Config: map[string]any{"baseUrl": llm.URL + "/v1", "model": "m", "apiKeyEnv": "E2E_LLM_KEY"}},
		Channels: []spec.ChannelSpec{{Type: "web"}},
	}
	a, err := build.Build(context.Background(), s)
	if err != nil {
		t.Fatal(err)
	}
	msg, err := a.Handle(context.Background(), core.Turn{ChannelUserID: "u", Text: "transfer my money"})
	if err != nil {
		t.Fatal(err)
	}
	if mcpCalls.Load() != 0 {
		t.Fatalf("guardrail should have blocked tools/call; mcp got %d calls", mcpCalls.Load())
	}
	if msg.Text == "" {
		t.Fatal("empty reply")
	}
}
