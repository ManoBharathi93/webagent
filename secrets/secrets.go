// Package secrets is the credential vault slot: where providers get their tokens and keys.
//
// A spec never contains a secret — it names one (e.g. "botTokenSecret": "SLACK_BOT_TOKEN"),
// and build resolves that name through the selected Secrets provider. Swapping env lookups for
// a managed vault is therefore a one-line spec change with no provider modifications.
//
// Built-ins: env (default), file (a per-tenant JSON store, mode 0600), and static (in-memory,
// for tests and embedding). Managed vaults (cloud secret managers, partner vaults) register
// here as they are built.
package secrets

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/TheAgent-net/webagent/core"
	"github.com/TheAgent-net/webagent/spi"
)

// Registry is the secrets slot.
var Registry = spi.New[core.Secrets]("secrets")

func init() {
	Registry.Register(spi.Descriptor{
		Name:    "env",
		Summary: "read secrets from environment variables (default; tenant-prefixed lookup first)",
	}, newEnv)
	Registry.Register(spi.Descriptor{
		Name:    "file",
		Summary: "per-tenant JSON secret store on disk (mode 0600)",
	}, newFile)
	Registry.SetDefault("env")
}

// --- env: the zero-config provider. Looks for a tenant-scoped variable first
// (TENANT_KEY, upper-cased and non-alphanumerics replaced with _), then the bare key. ---

type envSecrets struct{}

func newEnv(map[string]any) (core.Secrets, error) { return envSecrets{}, nil }

func (envSecrets) Name() string { return "env" }

func (envSecrets) Get(_ context.Context, tenant, key string) (string, error) {
	if tenant != "" {
		if v := os.Getenv(envKey(tenant) + "_" + envKey(key)); v != "" {
			return v, nil
		}
	}
	if v := os.Getenv(key); v != "" {
		return v, nil
	}
	return "", fmt.Errorf("env: %q: %w", key, core.ErrSecretNotFound)
}

// envKey normalizes a string into an environment-variable-safe token.
func envKey(s string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(s) {
		switch {
		case r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			b.WriteRune(r)
		default:
			b.WriteByte('_')
		}
	}
	return b.String()
}

// --- file: a JSON store of {tenant: {key: value}}, with "" as the default tenant. ---

type fileSecrets struct {
	mu   sync.RWMutex
	path string
	data map[string]map[string]string
}

func newFile(cfg map[string]any) (core.Secrets, error) {
	var c struct {
		Path string `json:"path"`
	}
	if err := core.Decode(cfg, &c); err != nil {
		return nil, fmt.Errorf("file secrets config: %w", err)
	}
	if c.Path == "" {
		return nil, fmt.Errorf("file secrets: path is required")
	}
	f := &fileSecrets{path: c.Path, data: map[string]map[string]string{}}
	if err := f.load(); err != nil {
		return nil, err
	}
	return f, nil
}

func (f *fileSecrets) Name() string { return "file" }

func (f *fileSecrets) load() error {
	b, err := os.ReadFile(f.path)
	if os.IsNotExist(err) {
		return nil // an absent store is empty, not an error
	}
	if err != nil {
		return fmt.Errorf("file secrets: %w", err)
	}
	if err := json.Unmarshal(b, &f.data); err != nil {
		return fmt.Errorf("file secrets: parse %s: %w", f.path, err)
	}
	return nil
}

// Get returns the tenant's value, falling back to the default ("") tenant. Tenants never see
// each other's values.
func (f *fileSecrets) Get(_ context.Context, tenant, key string) (string, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()
	if v, ok := f.data[tenant][key]; ok && v != "" {
		return v, nil
	}
	if tenant != "" {
		if v, ok := f.data[""][key]; ok && v != "" {
			return v, nil
		}
	}
	return "", fmt.Errorf("file: %q: %w", key, core.ErrSecretNotFound)
}

// --- static: an in-memory store, useful for tests and for embedding webagent in a host that
// already has its own configuration system. ---

// Static is an in-memory Secrets implementation. The zero value is unusable; use NewStatic.
type Static struct {
	mu   sync.RWMutex
	data map[string]map[string]string
}

// NewStatic returns an in-memory vault. values maps tenant -> key -> secret; use "" as the
// tenant for deployment-wide defaults.
func NewStatic(values map[string]map[string]string) *Static {
	cp := make(map[string]map[string]string, len(values))
	for tenant, kv := range values {
		m := make(map[string]string, len(kv))
		for k, v := range kv {
			m[k] = v
		}
		cp[tenant] = m
	}
	return &Static{data: cp}
}

func (s *Static) Name() string { return "static" }

// Set stores a secret for a tenant.
func (s *Static) Set(tenant, key, value string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.data[tenant] == nil {
		s.data[tenant] = map[string]string{}
	}
	s.data[tenant][key] = value
}

// Get returns the tenant's value, falling back to the default ("") tenant.
func (s *Static) Get(_ context.Context, tenant, key string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if v, ok := s.data[tenant][key]; ok && v != "" {
		return v, nil
	}
	if tenant != "" {
		if v, ok := s.data[""][key]; ok && v != "" {
			return v, nil
		}
	}
	return "", fmt.Errorf("static: %q: %w", key, core.ErrSecretNotFound)
}
