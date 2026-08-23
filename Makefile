.PHONY: test typecheck ci

test:
	bun test

typecheck:
	bunx tsc --noEmit

ci: test typecheck
