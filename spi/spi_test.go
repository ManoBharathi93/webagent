package spi

import "testing"

func newStr(s string) Constructor[string] {
	return func(map[string]any) (string, error) { return s, nil }
}

func TestRegistryDefaultAndOverride(t *testing.T) {
	r := New[string]("greeting")
	r.Register(Descriptor{Name: "hi"}, newStr("hi"))
	r.Register(Descriptor{Name: "yo"}, newStr("yo"))
	r.SetDefault("hi")

	if got, err := r.Get("", nil); err != nil || got != "hi" {
		t.Fatalf("empty pick should resolve default: got %q err %v", got, err)
	}
	if got, err := r.Get("yo", nil); err != nil || got != "yo" {
		t.Fatalf("explicit pick should override: got %q err %v", got, err)
	}
}

func TestRegistryUnknownProvider(t *testing.T) {
	r := New[string]("greeting")
	r.Register(Descriptor{Name: "hi"}, newStr("hi"))
	r.SetDefault("hi")
	if _, err := r.Get("nope", nil); err == nil {
		t.Fatal("expected an error for an unknown provider")
	}
}

func TestRegistryNoDefault(t *testing.T) {
	r := New[string]("greeting")
	r.Register(Descriptor{Name: "hi"}, newStr("hi"))
	if _, err := r.Get("", nil); err == nil {
		t.Fatal("expected an error when no default is set and the pick is empty")
	}
}

func TestOptionsDefaultFirstThenSorted(t *testing.T) {
	r := New[string]("greeting")
	r.Register(Descriptor{Name: "zzz"}, newStr(""))
	r.Register(Descriptor{Name: "aaa"}, newStr(""))
	r.Register(Descriptor{Name: "mmm"}, newStr(""))
	r.SetDefault("mmm")
	opts := r.Options()
	if opts[0].Name != "mmm" {
		t.Fatalf("default should sort first, got %s", opts[0].Name)
	}
	if opts[1].Name != "aaa" || opts[2].Name != "zzz" {
		t.Fatalf("non-defaults should be alphabetical, got %+v", opts)
	}
}

func TestRegisterDuplicatePanics(t *testing.T) {
	r := New[string]("greeting")
	r.Register(Descriptor{Name: "hi"}, newStr(""))
	defer func() {
		if recover() == nil {
			t.Fatal("expected a panic on duplicate registration")
		}
	}()
	r.Register(Descriptor{Name: "hi"}, newStr(""))
}

func TestSetDefaultUnknownPanics(t *testing.T) {
	r := New[string]("greeting")
	defer func() {
		if recover() == nil {
			t.Fatal("expected a panic when defaulting to an unregistered provider")
		}
	}()
	r.SetDefault("missing")
}

type capProvider struct{}

func (capProvider) Capabilities() Capabilities { return Capabilities{"x": true} }

func TestRuntimeCapabilities(t *testing.T) {
	if c := RuntimeCapabilities(capProvider{}); !c.Has("x") {
		t.Fatal("expected capability x from a Capable provider")
	}
	if c := RuntimeCapabilities("plain"); c != nil {
		t.Fatal("a non-Capable value should yield nil capabilities")
	}
}
