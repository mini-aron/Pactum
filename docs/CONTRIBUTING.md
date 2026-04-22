# Contributing to Pactum

Thanks for your interest in contributing.

## Development Setup

1. Install dependencies:

```bash
pnpm install
```

2. Validate the workspace:

```bash
pnpm typecheck
pnpm test
```

## Local Workflow

- Use focused scripts while developing:
  - `pnpm --filter @pactum-labs/core typecheck`
  - `pnpm --filter @pactum-labs/react typecheck`
- For UI changes:
  - `cd packages/pactum_react && pnpm storybook`

## Coding Guidelines

- Keep changes small and reviewable.
- Prefer immutable updates in core operations.
- Do not modify unrelated files.
- Follow existing naming and formatting style.
- Add or update tests when behavior changes.

## Commit Guidelines

- Use Conventional Commit style:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `docs: ...`
  - `test: ...`
- Keep subject lines concise and imperative.

## Pull Request Checklist

- [ ] Scope is focused and minimal.
- [ ] Typecheck passes.
- [ ] Tests pass or rationale provided.
- [ ] Documentation updated when API/behavior changed.
- [ ] No secrets or credentials included.

## Reporting Issues

Please include:

- expected behavior
- actual behavior
- reproduction steps
- environment details (Node/PNPM/OS)

