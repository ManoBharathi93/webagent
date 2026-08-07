package spi_test

import (
	"fmt"

	"github.com/TheAgent-net/webagent/spi"
)

// ExampleRegistry shows the core slot mechanic: register providers, set a default, and resolve
// a pick (an empty pick resolves to the default; an explicit name overrides it).
func ExampleRegistry() {
	reg := spi.New[string]("greeting")
	reg.Register(spi.Descriptor{Name: "casual", Summary: "informal"},
		func(map[string]any) (string, error) { return "hey", nil })
	reg.Register(spi.Descriptor{Name: "formal", Summary: "polite"},
		func(map[string]any) (string, error) { return "hello", nil })
	reg.SetDefault("casual")

	def, _ := reg.Get("", nil)          // empty pick -> default
	formal, _ := reg.Get("formal", nil) // explicit pick -> override
	fmt.Println(def, formal)
	// Output: hey hello
}
