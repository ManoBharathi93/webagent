package action

import (
	"context"
	"testing"
)

func TestNoneProviderIsDefaultAndYieldsNoTools(t *testing.T) {
	p, err := Registry.Get("", nil) // empty pick -> default
	if err != nil {
		t.Fatal(err)
	}
	if p.Name() != "none" {
		t.Fatalf("default action provider should be none, got %s", p.Name())
	}
	tools, err := p.Tools(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(tools) != 0 {
		t.Fatalf("none should yield no tools, got %d", len(tools))
	}
}

func TestDemoProviderYieldsTools(t *testing.T) {
	p, err := Registry.Get("demo", nil)
	if err != nil {
		t.Fatal(err)
	}
	tools, err := p.Tools(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(tools) == 0 {
		t.Fatal("demo provider should yield at least one tool")
	}
}
