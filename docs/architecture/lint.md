# Lint

Every style rule is enforced by a tool, not by a review. A rule is switched on only after a count shows which files it would refuse. Four enforcers:

- **`@widgetarium/eslint-plugin`**: the framework's rules, the ones every project built on Widgetarium follows. `npm run lint:style` runs it on this repository; `create` lays it into every project.
- **`node tools/lint-code.mts <roots>`**: this repository's own rules (comments, sizes, typing, casts, the `server` condition).
- **The generator**: `npm run generate -- --check` refuses a stale or forbidden generated file.
- **Types and starters**: `npm run test:types`, and the refusals `app()` and `server()` throw at start.

## A project's config

```js
import widgetarium from "@widgetarium/eslint-plugin";

export default [...widgetarium.configs.recommended, { rules: { "@widgetarium/no-choice-strings": "off" } }];
```

`configs.recommended` switches every rule on, as an error except `handler-ownership`, `layer-order` and `single-use-lib`, warnings. Its parser is Babel's.

## Every rule and what enforces it

| Rule                                                                                                                                                                                                     | Enforced by                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| a building block is a named exported const, PascalCase, ending with its kind; `module(` → `Module`, `event(` → `Event`, `subscriber(` → `Subscriber`                                                     | `building-block-names`                                                   |
| a request's string is the constant without its suffix, kebab case                                                                                                                                        | `feature-layout` (`wrongShortName`); `query()` / `command()` at run time |
| a declaration is a fluent chain, never an options object                                                                                                                                                 | types                                                                    |
| a handler uses only what its module's `provide` and its runtime's `.provide` return                                                                                                                      | types (`buildersOf`)                                                     |
| a module emits only its own events                                                                                                                                                                       | types (`buildersOf`, typed by the package's events); `emit` at run time  |
| a guard's or middleware's `.requires` on a `#module` request is met by the module's `provide` or the runtime's                                                                                           | types (`.guard` / `.use` on the request)                                 |
| a guard's or middleware's `.requires` is met by the module's `provide` or the runtime's                                                                                                                  | `app()` / `server()` at start                                            |
| a module's `provide` never returns a key its runtime provides                                                                                                                                            | `app()` / `server()` at start                                            |
| a request is `.public()` or `.callableBy(...)` once, never both                                                                                                                                          | the request, where it is declared                                        |
| a call over a transport reaches only a `.public()` request                                                                                                                                               | `refuseCaller` in the mediator, before input parsing                     |
| a server request is covered by a guard                                                                                                                                                                   | `server()` at start                                                      |
| strings only as free-form data (request and module names)                                                                                                                                                | `no-choice-strings`                                                      |
| a data module's feature holds `requests.ts`; no `ui/`, no `.tsx`; `module.ts` holds only the `module(...)` chain                                                                                         | `feature-layout`, `feature-placement`, `module-definition`               |
| layers import one way, `shared → gateways → features → module.ts`; a feature imports only its own folder                                                                                                 | `layer-order` (warning)                                                  |
| `"./module"` is imported only by an app; `"./server"` only by a data module; a package reaches another only through `"."`                                                                                | `module-imports`                                                         |
| only `apps/server` resolves the `server` condition                                                                                                                                                       | `server-condition` (tools/lint)                                          |
| no top-level state in a module: no `let`/`var`, no writable `Map`, `Set`, `WeakMap` or array                                                                                                             | `module-state`                                                           |
| a `lib/` export with one importing file belongs in that file                                                                                                                                             | `single-use-lib` (warning)                                               |
| the contract reads only `shared/schema` and packages; nothing re-exported under `generated/`; every generated file fresh and headed                                                                      | the generator, `test:generated`                                          |
| `module.ts` ends with `.handles(...handled)` from `"./generated/handled.js"`; `package.json` maps `#module`; `"./server"` exported exactly when the module has non-public requests; a name declared once | the generator                                                            |
| comments: only `TODO:` and `TRADE-OFF:`                                                                                                                                                                  | `comments` (tools/lint), the edit hook                                   |
| early returns                                                                                                                                                                                            | `early-return` (tools/lint)                                              |
| sizes: a file over 400 lines, a function over 80                                                                                                                                                         | `file-size`, `function-size` (tools/lint)                                |
| type budget: 200 requests over 1.2x the recorded instantiations                                                                                                                                          | `test:type-budget`                                                       |
| a gateway decides nothing; lib holds no state; the handler holds the rule ([layers.md](layers.md))                                                                                                       | no tool: review                                                          |
| split by area, not by line count                                                                                                                                                                         | no tool: the `cohesion-reviewer`                                         |
| a client package imports no gateway and no `"./module"`; declared dependencies; no cycles; blocks; legacy                                                                                                | **planned**                                                              |

The rules of the older module shape (`contract-imports`, `server-module`, `handler-ownership`, the `contract.ts`/`handlers.ts` half of `feature-layout`) stay on until the last such package is migrated ([legacy.md](legacy.md#the-older-module-shape)).

Each rule is proven by breaking it on purpose: `npm run test:eslint-plugin` runs ESLint's `RuleTester` with a valid and an invalid case per rule, and each rule was falsified once. A rule's message says what to do, not only what is wrong.

## Final validation

Final validation = lint → `format:check` → tests, and the first red step stops the run. In this repository `npm test` opens with `lint:style` and `format:check`; in a created project `npm run check` runs `lint`, `format:check`, `typecheck`, then `widgetarium check`.

Agents format on every edit: the `PostToolUse` hook in `.claude/settings.json` runs `prettier --write` on each file a Write or Edit touches, so `format:check` only catches a file written another way.
