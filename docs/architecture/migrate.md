# Migrating a package to this architecture

"Convert X to the new architecture" means these steps, in this order, for one package at a time. The reference is the pair that was migrated first: `packages/state/layout` (data) and `packages/client/shell` (views). When a step is unclear, copy what that pair does.

Read first: [layers.md](layers.md) (who may do what), [requests.md](requests.md), [placement.md](placement.md).

## 1. Inventory, before any edit

Write down, with `file:line`:

- every request in `features/**/contract.ts` and its handler in `handlers.ts`;
- every gateway, every `*Store` or stateful class in `lib/`, every module-level `let`/`Map`/`Set`;
- every rule: a transition, a refusal, a choice. Note where it lives today: a handler, a store, a gateway;
- every `ui/` file;
- every importer of `<package>/module` and `<package>/gateways`, every parts factory (`webXParts`, `obsidianXParts`) and the host that builds it;
- every test that covers the package.

## 2. Decide the shape of each piece

| Today                                            | Becomes                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| a contract and its handler                       | one chain in `features/<f>/requests.ts`                              |
| a store holding state                            | a gateway that stores it, methods named for the data                 |
| a rule in a store or a gateway                   | the handler; its computation a pure function in `features/<f>/lib/`  |
| a computation two handlers of one feature repeat | `features/<f>/lib/`; two features → `shared/lib/`                    |
| a parts factory a host builds                    | the module's picker, `gateways/<module>-parts/`, keyed by `Platform` |
| `ui/`                                            | a client package, `packages/client/<name>`                           |
| business data (chats, tabs, billing)             | `packages/domain/<name>`                                             |
| the app's own state (layout, selection)          | `packages/state/<name>`                                              |
| short-lived UI state (hover, drag, scroll)       | stays in the view; never a request                                   |

## 3. The data module

1. `package.json`: `"widgetarium": { "level": "domain" }`, `"sideEffects": false`, exports `"."` → `./index.ts` and `"./module"` → `./module.ts`, each with `source`, `types`, `default`. No `"./gateways"`. No React dependency.
2. Schemas → `shared/schema/<record>.schema.ts`. A shape only the storage needs stays beside its gateway (`KeptPaneTreeSchema`).
3. Gateways → `gateways/<gateway>/`: the abstract class named for its data, methods named for what they read and write (`sides()`, `saveSides(sides, reason)`, `sidesChanged(listener)`), one implementation per storage. No rule, no call to another gateway.
4. The picker → `gateways/<module>-parts/<module>-parts.gateway.ts`: `const PARTS_ON: Record<Platform, (facts) => Parts>` and `<module>PartsOn(facts)`.
5. Requests → `features/<f>/requests.ts`: short names (the constant without its suffix, kebab case), `.inject({ data: DataGateway })`, the rule in `.handle`, `refuse(reason)` before a write, `was → now` logged ([code-style.md](code-style.md#logging)). A request of another module: import its contract from that module's `"."`, declare `.sends(...)`, call `send`.
6. `module.ts`: `module("<name>").queries(…).commands(…).provide((facts) => ({ ...<module>PartsOn(facts) }))`, every request listed by name.
7. `npm run generate`: writes `generated/contract.ts` and the root `index.ts`. A refusal names the request; fix the request, never the generated file.

## 4. The client package

1. `package.json`: `"widgetarium": { "level": "client" }`, export `"."` → `./index.ts`, the data module as a dependency.
2. Blocks → `features/<f>/ui/<block>/` (`.tsx` only); their hooks → `features/<f>/lib/`; what two features use → `shared/ui/`, `shared/lib/`; public views named in `shared/ui/index.ts`.
3. Every import of the data module is from its `"."`. Data is read with `useQuery` / `useOptionalQuery` and written with `useCommand`; a block holds no rule.
4. `npm run generate` writes the root `index.ts`.

## 5. The apps

1. Start the module once: `app({ modules: [XModule], platform, scope: { workspaceId } })`, in one function the app and every host call (`startLayoutApp`). Views and adapters share that one app.
2. Hosts pass facts only. Delete every parts factory and every `X.with(parts)` outside tests.
3. A module that must run on a server is listed in `apps/server`'s `server({ modules })` and needs a guard on every request.

## 6. Delete the old shape

Delete `contract.ts`, `handlers.ts`, the stores, `generated/index.ts`, `generated/module.ts`, `generated/gateways.ts`, the `"./gateways"` export, the old package if it was renamed, and every dependency on it in `package.json` files. Refresh the lockfile (`npm install --package-lock-only`). Every `tsconfig.json` `include` and every path in `docs/` that named the old files is updated or removed.

## 7. Tests

- Rules: `app({ modules: [XModule.with(fakes)] }).send(Request, input)` against the real handlers, one check per rule and per refusal (`tools/layout-rules-checks.ts`).
- Persistence across a restart, through the real gateway of each platform the module answers.
- Views: a real-Chrome test of the path a person presses (`tools/pane-board-test.ts`).
- Every new test script is in the `npm test` chain, and each check is broken once on purpose and seen red.

## 8. Done when

- [ ] `npm run test:types`, `npm run lint:style`, `npm run format:check`, `npm run test:eslint-plugin`, `npm run test:generated`, `npm run generate -- --check` and the package's own tests pass.
- [ ] `grep -rn "clientModule\|serverModule\|handler(\|/gateways\"" packages/<layer>/<name>` finds nothing.
- [ ] No `*Store` in a data module, no rule in a gateway: each gateway method read once against [layers.md](layers.md).
- [ ] Nothing imports the old package path, `"./gateways"`, or a parts factory.
- [ ] The app was opened and the migrated path pressed by hand (Tauri: the worktree copy in headless Chrome on port 5174, since the Tauri window cannot be captured), and the state survived a restart.
- [ ] [legacy.md](legacy.md#the-older-module-shape) no longer lists the package, and the README status line is true.
