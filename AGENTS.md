# AGENTS.md

Camouflage is a VS Code extension that visually masks sensitive values in configuration files
(.env, .json, .yaml, .toml, .properties, .sh) using text decorations. It **never modifies file
content** -- masking is purely visual via CSS tricks (letterSpacing, opacity, pseudo-elements).

## Build / Lint / Test / Package Commands

```bash
npm install                          # Install dependencies
npm run compile                      # Compile TypeScript (tsc -p ./) → out/
npm run watch                        # Watch mode compilation
npm run lint                         # ESLint (src/)
npm run format                       # Prettier (write)
npm test                             # Run all tests (Jest)
npm test -- --watch                  # Watch mode
npm test -- --coverage               # With coverage report
npm test -- path/to/file.test.ts     # Run a single test file
npm test -- --testNamePattern="name" # Run tests matching a name pattern
npm test -- --clearCache             # Clear Jest cache if tests are stale
npm run package                      # vsce package → produces .vsix file
```

Coverage threshold is 80% (branches, functions, lines, statements).

## CI/CD Pipeline

Four GitHub Actions workflows on `main`:

| Workflow                    | Trigger                       | What it does                                                                                        |
| --------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| **CI** (`ci.yml`)           | PR → main                     | `npm ci` → prettier --check → lint → test --coverage → Codecov                                      |
| **Publish** (`publish.yml`) | push/merge to main            | CI steps → compile → semantic-release → `vsce package` → `vsce publish` → GitHub Release with .vsix |
| **CodeQL** (`codeql.yml`)   | push/PR to main + weekly cron | Security & quality analysis (TypeScript)                                                            |
| **Stale** (`stale.yml`)     | daily cron                    | Marks issues stale after 60 days, closes after 14 more                                              |

**Release flow**: semantic-release reads conventional commits → bumps version in `package.json`
→ generates `CHANGELOG.md` → commits with `chore(release): x.y.z [skip ci]` → creates GitHub
release → workflow then runs `vsce package` + `vsce publish` to VS Code Marketplace.

Secrets required: `VSCE_PAT` (Marketplace token), `CODECOV_TOKEN`, `GITHUB_TOKEN` (auto).

## Git Hooks (Husky)

- **pre-commit**: `npx lint-staged` → runs `eslint --fix` + `prettier --write` on staged
  `.ts`/`.js` files, `prettier --write` on `.json`/`.md`/`.yml`/`.yaml`
- **commit-msg**: `npx commitlint` → enforces Conventional Commits format

## Project Structure

```
src/
  extension.ts              # Entry point: activate(), deactivate(), command registration
  core/camouflage.ts        # Main engine: decorations, events, status bar
  core/types.ts             # HiddenTextStyle enum
  parsers/                  # Strategy pattern: one parser per format
    types.ts                # ParsedVariable, Parser interface
    base-parser.ts          # Abstract base class
    env-parser.ts           # .env, .envrc, .sh
    json-parser.ts          # .json (nested keys)
    yaml-parser.ts          # .yaml, .yml (nested keys)
    toml-parser.ts          # .toml
    properties-parser.ts    # .properties, .ini, .conf
    index.ts                # ParserRegistry singleton
  lib/text-generator.ts     # Pure: generateHiddenText(), scrambleText()
  decorators/               # @HandleErrors, @Log, @ValidateConfig, @Debounce, @MeasurePerformance
  utils/config.ts           # Configuration facade (all getters for camouflage.* settings)
  utils/file.ts             # isSupportedFile(), parseFileContent()
  utils/pattern-matcher.ts  # Wildcard pattern matching (*, KEY*, *KEY)
  __mocks__/vscode.ts       # Full VS Code API mock for Jest
```

Tests live in `__tests__/` dirs co-located with each module (e.g., `parsers/__tests__/`).

## Dependency Rules

```
extension.ts -> core/ -> parsers/ + lib/ + utils/
```

- `lib/` must be pure functions -- no VS Code API, no side effects
- `parsers/` must not import from `core/` or `utils/`
- `utils/` must not import from `core/`
- No circular dependencies

## Code Style

### TypeScript

- **Strict mode** enabled (`strict: true`, `experimentalDecorators: true`)
- Target: ES2022, Module: NodeNext
- Explicit types on function signatures; avoid `any` (eslint warns)
- Use `interface` for object shapes, `type` for unions/computed types
- Prefer `const` over `let`; use `===` always (`eqeqeq: error`)
- Always use curly braces, even for single-line blocks (`curly: error`)
- Prefix unused params with `_` (`argsIgnorePattern: "^_"`)

### Formatting (Prettier)

- Single quotes, 2-space indent, 100 char print width
- Trailing commas (ES5), semicolons always

### Naming

- `camelCase` for variables/functions, `PascalCase` for classes/interfaces/enums
- `UPPER_SNAKE_CASE` for true constants
- Booleans: prefix with `is`, `has`, `should`, `can`
- Files: `kebab-case.ts`, tests: `*.test.ts`
- No `I` prefix on interfaces

### Imports (order)

1. Node.js built-ins (`import * as fs from 'fs'`)
2. External packages (`import * as vscode from 'vscode'`)
3. Internal modules grouped by directory
4. Type-only imports (`import type { ... }`)

Use `import * as config from '../utils/config'` (namespace import) for the config facade.
Named exports preferred; no default exports.

### Comments

- JSDoc on public functions
- Inline comments explain **why**, not what
- TODO format: `// TODO(#issue): description`

## Error Handling

- `core/` methods use `@HandleErrors` decorator (catches + shows vscode error message)
- Parsers return empty array on parse failure (never throw)
- `lib/` is pure -- caller handles errors
- Security: fail closed (hide on error, never expose values)
- Never log secret values; never include file paths in user-facing errors

## Testing

- Framework: Jest with ts-jest, VS Code API mocked in `src/__mocks__/vscode.ts`
- Pattern: AAA (Arrange, Act, Assert) in `describe`/`it` blocks
- Import from `@jest/globals` (`import { describe, it, expect, jest } from '@jest/globals'`)
- Mock vscode with `jest.mock('vscode', () => ({ ... }), { virtual: true })`
- Use `jest.clearAllMocks()` in `beforeEach`
- Descriptive test names: `'should return false when patterns array is empty'`
- Test edge cases: empty input, null, special characters, large files
- Use fake timers for debounce tests (`jest.useFakeTimers()`)

## Commits

Conventional Commits enforced by commitlint + husky:

```
feat(scope): add feature        # minor bump
fix(scope): fix bug             # patch bump
BREAKING CHANGE: ...            # major bump
docs|style|refactor|test|chore  # no version bump
```

Scopes: `core`, `parsers`, `config`, `decorators`, `patterns`, `tests`, `docs`

## Security Rules (Critical)

- **Never modify file content** -- decorations only
- **All processing is local** -- no network requests with user data
- **No telemetry of sensitive data** -- no key names, values, or file paths
- Sanitize user-provided patterns before regex compilation (prevent ReDoS)
- Never use `eval()` or `Function()`
- Always dispose resources (`context.subscriptions.push(...)`)

## Adding a New Parser

1. Create `src/parsers/new-parser.ts` extending `BaseParser`
2. Implement `parse()` returning `ParsedVariable[]` (with correct startIndex/endIndex)
3. Register in `src/parsers/index.ts` ParserRegistry
4. Add to `package.json` parsers.enabled enum
5. Add tests in `src/parsers/__tests__/new-parser.test.ts`

## Adding a New Configuration Setting

1. Define in `package.json` under `contributes.configuration.properties`
2. Add getter in `src/utils/config.ts`
3. Use via `import * as config from '../utils/config'`

## Adding a New Command

1. Define in `package.json` under `contributes.commands`
2. Register in `src/extension.ts` `activate()` with `vscode.commands.registerCommand()`
3. Add keybinding and menu entry in `package.json` if needed
4. Push disposable to `context.subscriptions`
