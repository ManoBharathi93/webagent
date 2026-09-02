.PHONY: test typecheck ci bench

test:
	bun test

typecheck:
	bunx tsc --noEmit

bench:
	bun bench/run.ts

ci: test typecheck
