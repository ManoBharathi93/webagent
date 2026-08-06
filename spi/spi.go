// Package spi is the Service Provider Interface machinery shared by every slot.
//
// A "slot" is one pluggable pillar of an agent (model, memory, guardrails, retrieval,
// channels, ...). Each slot owns a Registry of providers. A provider is registered with
// a Descriptor (its identity + advertised capabilities) and a Constructor. A business's
// spec picks one provider per slot by name; an empty pick resolves to the slot default.
//
// This is the contract partner companies build against, so it is deliberately small and
// stable. Three properties make it proper for a multi-partner, default-provider ecosystem:
//
//   - default + override: Get("") returns the slot default; Get("name") swaps it.
//   - capability negotiation: providers advertise Capabilities; the agent uses the rich
//     path when present and degrades gracefully when not — no lowest-common-denominator.
//   - discoverability: Options() returns the menu a business picks from.
package spi

import (
	"fmt"
	"sort"
)

// Capabilities is the set of optional features a provider advertises. Slot packages
// define their own capability-name constants; the core stays agnostic.
type Capabilities map[string]bool

// Has reports whether a capability is advertised.
func (c Capabilities) Has(name string) bool { return c[name] }

// Descriptor is provider metadata registered alongside the constructor. It is what
// Options() surfaces to a business choosing from the menu.
type Descriptor struct {
	Name         string       // stable id used in a spec (e.g. "hybrid")
	Summary      string       // one line shown in the palette
	Capabilities Capabilities // optional features this provider supports
	Partner      bool         // true if provided by a collaborating company (vs built-in)
}

// Capable is the optional runtime side of capability negotiation: a provider instance
// may implement it so callers can branch on what it actually supports at call time.
type Capable interface {
	Capabilities() Capabilities
}

// Constructor builds a provider instance from opaque per-provider config (the spec's
// `config` block, passed through untouched — this is the passthrough that lets a partner
// expose provider-specific settings without widening the core interface).
type Constructor[T any] func(cfg map[string]any) (T, error)

// Registry is one slot's set of providers, with a designated default.
type Registry[T any] struct {
	slot    string
	entries map[string]regEntry[T]
	def     string
}

type regEntry[T any] struct {
	desc Descriptor
	ctor Constructor[T]
}

// New creates an empty registry for a named slot.
func New[T any](slot string) *Registry[T] {
	return &Registry[T]{slot: slot, entries: map[string]regEntry[T]{}}
}

// Register adds a provider. Registering the same name twice panics — a programming error
// surfaced at init time, not a runtime surprise.
func (r *Registry[T]) Register(d Descriptor, c Constructor[T]) {
	if _, dup := r.entries[d.Name]; dup {
		panic(fmt.Sprintf("spi: %s provider %q registered twice", r.slot, d.Name))
	}
	r.entries[d.Name] = regEntry[T]{desc: d, ctor: c}
}

// SetDefault designates the zero-config provider for this slot. It must name a registered
// provider.
func (r *Registry[T]) SetDefault(name string) {
	if _, ok := r.entries[name]; !ok {
		panic(fmt.Sprintf("spi: %s default %q is not registered", r.slot, name))
	}
	r.def = name
}

// Default returns the slot's default provider name (empty if none set).
func (r *Registry[T]) Default() string { return r.def }

// Get resolves a provider. An empty name resolves to the default; a provider that is not
// registered yields a clear error listing the menu.
func (r *Registry[T]) Get(name string, cfg map[string]any) (T, error) {
	var zero T
	if name == "" {
		name = r.def
	}
	if name == "" {
		return zero, fmt.Errorf("spi: %s has no default; pick one of: %s", r.slot, join(r.names()))
	}
	e, ok := r.entries[name]
	if !ok {
		return zero, fmt.Errorf("spi: unknown %s provider %q (have: %s)", r.slot, name, join(r.names()))
	}
	return e.ctor(cfg)
}

// Options lists the registered providers (the menu), default first.
func (r *Registry[T]) Options() []Descriptor {
	out := make([]Descriptor, 0, len(r.entries))
	for _, e := range r.entries {
		out = append(out, e.desc)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if (out[i].Name == r.def) != (out[j].Name == r.def) {
			return out[i].Name == r.def
		}
		return out[i].Name < out[j].Name
	})
	return out
}

func (r *Registry[T]) names() []string {
	out := make([]string, 0, len(r.entries))
	for k := range r.entries {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func join(ss []string) string {
	s := ""
	for i, x := range ss {
		if i > 0 {
			s += ", "
		}
		s += x
	}
	return s
}
