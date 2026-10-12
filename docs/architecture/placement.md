# Where a file goes

A file's place is decided by **what it is**, never by how many places use it. Nothing moves when a second user appears, so no one has to guess.

## Inside a domain

```
packages/<domain>/
  index.ts                       public API: re-exports only
  package.json                   name, level, the domains it uses
  schemas/
    <record>.schema.ts
  logic/
    <record>/
      <name>.query.ts
      <name>.command.ts
      <name>.service.ts
  widgets/
    <widget>/
      index.ts                   public API of the widget: re-exports widget.tsx
      widget.tsx                 createWidget, metadata, layout
      hooks/                     state of the view only
        use-<what>.ts
      ui/                        parts only this widget draws
        <part>.tsx
```

- `index.ts` holds re-exports and nothing else.
- A widget folder starts as `index.ts` + `widget.tsx`; `hooks/` and `ui/` appear when the 200-line limit needs them.
- A part drawn by two widgets of one domain goes to `widgets/<domain>-ui/` _(one shared folder per domain)_; a part with no domain goes to the kit.

## The table

| The file is…                                                                           | It goes to                                           |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| the shape of a record                                                                  | `packages/<domain>/schemas/<record>.schema.ts`       |
| something drawn for a domain                                                           | `packages/<domain>/widgets/<widget>/`                |
| something drawn whose schema names no record                                           | a common widget package (`registry/`)                |
| a read for a widget                                                                    | `packages/<domain>/logic/<record>/<name>.query.ts`   |
| a write                                                                                | `packages/<domain>/logic/<record>/<name>.command.ts` |
| work that runs alone (cursor tracking, sync, a timer)                                  | `packages/<domain>/logic/<record>/<name>.service.ts` |
| reading or writing an outside system (vault, Supabase, SQL, an existing backend's API) | a common package, `sources/<system>/`                |
| a pure helper (format a date, clamp a number)                                          | a common package, `lib/`                             |
| a drawn part with no domain (resize handle, spinner)                                   | the kit                                              |
| a route, a page, a binding                                                             | `apps/<product>/`                                    |
| how to render, store, or reach the network on one platform                             | `hosts/<runtime>/`                                   |

`<record>` is the kind of record (`tasks`), `<name>` is the file (`create-task`). Example: `packages/planning/logic/tasks/create-task.command.ts`.

## Questions an agent asks, answered

**Another domain needs this query.** It stays where it is and is exported from the domain's `index.ts`. The other domain declares the dependency and imports it.

**Two apps need the same widget.** It is in a domain already; both apps import it from the domain's `index.ts`.

**Does this go to common?** Only if it names no record of any domain. Common cannot import a domain, so a file that needs a domain schema does not compile there.

**Is there already a query for this?** Open `packages/<domain>/logic/<record>/`. Every query of a record is in that one folder.

**A person already has a backend.** Its HTTP API is a data source in common (`sources/<their-api>/`); queries and commands call it. Nothing else changes: the backend is an outside system like the vault.

**A hook in a widget?** Yes, in `hooks/`, for state of the view only: hover, open, a drag in progress. A hook never reads or writes data; that is a query or a command reached through a port.

**A widget that draws tasks as a kanban and as a table?** Two widgets, `task-kanban` and `task-table`, bound to the same query.

## File names

| Suffix        | Kind                                                             |
| ------------- | ---------------------------------------------------------------- |
| `.schema.ts`  | zod schema; the value is named `*Schema`, its type has no suffix |
| `.query.ts`   | one `*Query` class                                               |
| `.command.ts` | one `*Command` class                                             |
| `.service.ts` | one `*Service` class                                             |
| `.tsx`        | a widget or a drawn part, TSX + Tailwind                         |

Files are kebab-case; exports are named. Whether a handler runs only on a server is written in its code, not in its file name ([handlers.md](handlers.md#server-handlers)).
