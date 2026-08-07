.PHONY: all fmt fmt-check vet lint test race cover tidy vuln ci

all: fmt vet test

fmt:
	gofmt -w .

fmt-check:
	@test -z "$$(gofmt -l .)" || (echo "gofmt needed on:"; gofmt -l .; exit 1)

vet:
	go vet ./...

lint:
	golangci-lint run

test:
	go test ./...

race:
	go test -race ./...

cover:
	go test -cover ./...

tidy:
	go mod tidy

vuln:
	govulncheck ./...

# What CI runs.
ci: fmt-check vet race cover
