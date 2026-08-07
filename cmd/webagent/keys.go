package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"golang.org/x/term"
)

// providerEnv maps a friendly model-provider name to the environment variable its key lives
// in. These match the gateway brain's defaults (see package brain).
var providerEnv = map[string]string{
	"openrouter": "OPENROUTER_API_KEY",
	"gateway":    "LLM_API_KEY",
}

// keysFile is the per-user credential store, outside the repo, in the OS config dir.
func keysFile() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "webagent", "keys.json"), nil
}

func loadKeys() (map[string]string, error) {
	path, err := keysFile()
	if err != nil {
		return nil, err
	}
	b, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return map[string]string{}, nil
	}
	if err != nil {
		return nil, err
	}
	m := map[string]string{}
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	return m, nil
}

func saveKeys(m map[string]string) error {
	path, err := keysFile()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	b, _ := json.MarshalIndent(m, "", "  ")
	return os.WriteFile(path, b, 0o600)
}

// envName resolves a provider alias (e.g. "openrouter") or a raw env var name to the env var
// to store under.
func envName(name string) string {
	if e, ok := providerEnv[strings.ToLower(name)]; ok {
		return e
	}
	return name
}

// applyKeys loads stored keys into the environment for names not already set. A real exported
// env var always wins (12-factor), so nothing here overrides an explicit export.
func applyKeys() {
	m, err := loadKeys()
	if err != nil {
		return
	}
	for name, val := range m {
		if val != "" && os.Getenv(name) == "" {
			_ = os.Setenv(name, val)
		}
	}
}

func runKeys(args []string) {
	if len(args) == 0 {
		keysUsage()
	}
	switch args[0] {
	case "set":
		if len(args) < 2 {
			keysUsage()
		}
		name := envName(args[1])
		val, err := readSecret(fmt.Sprintf("Enter API key for %s (%s): ", args[1], name))
		if err != nil {
			exitErr(err)
		}
		if val = strings.TrimSpace(val); val == "" {
			exitErr(fmt.Errorf("no key entered"))
		}
		m, err := loadKeys()
		if err != nil {
			exitErr(err)
		}
		m[name] = val
		if err := saveKeys(m); err != nil {
			exitErr(err)
		}
		path, _ := keysFile()
		fmt.Printf("Saved %s to %s (mode 0600).\n", name, path)
	case "list":
		m, err := loadKeys()
		if err != nil {
			exitErr(err)
		}
		if len(m) == 0 {
			fmt.Println("no keys stored")
			return
		}
		names := make([]string, 0, len(m))
		for k := range m {
			names = append(names, k)
		}
		sort.Strings(names)
		for _, k := range names {
			fmt.Printf("%-22s %s\n", k, mask(m[k]))
		}
	case "rm":
		if len(args) < 2 {
			keysUsage()
		}
		name := envName(args[1])
		m, err := loadKeys()
		if err != nil {
			exitErr(err)
		}
		delete(m, name)
		if err := saveKeys(m); err != nil {
			exitErr(err)
		}
		fmt.Printf("Removed %s.\n", name)
	default:
		keysUsage()
	}
}

// readSecret reads a secret without echoing when stdin is a terminal; otherwise it reads a
// line, so `echo $KEY | webagent keys set openrouter` works in scripts and CI.
func readSecret(prompt string) (string, error) {
	fd := int(os.Stdin.Fd())
	if term.IsTerminal(fd) {
		fmt.Fprint(os.Stderr, prompt)
		b, err := term.ReadPassword(fd)
		fmt.Fprintln(os.Stderr)
		return string(b), err
	}
	s, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && err != io.EOF {
		return "", err
	}
	return strings.TrimRight(s, "\r\n"), nil
}

func mask(s string) string {
	if len(s) <= 8 {
		return "****"
	}
	return s[:4] + "…" + s[len(s)-4:]
}

func keysUsage() {
	fmt.Fprintln(os.Stderr, "usage: webagent keys set <provider|ENV_VAR> | keys list | keys rm <provider|ENV_VAR>")
	fmt.Fprintln(os.Stderr, "  providers: openrouter (OPENROUTER_API_KEY), gateway (LLM_API_KEY)")
	os.Exit(2)
}

func exitErr(err error) {
	fmt.Fprintln(os.Stderr, "error:", err)
	os.Exit(1)
}
