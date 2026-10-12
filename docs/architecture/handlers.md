# Handlers

"Handler" is the shared word for the three kinds of logic class. A widget declares ports; a handler answers one. Logic exists only in handlers.

| Kind    | Is                                                          | Called by                                                         |
| ------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| query   | reads; answers a value or a page of rows                    | a widget through `useData`, or other logic directly               |
| command | writes; answers `{ ok, output }` or `{ ok: false, reason }` | a widget, or other logic directly                                 |
| service | runs on its own: starts with the app, stops with it         | nothing; it writes through commands or keeps a value queries read |

```ts
class TasksQuery extends IQuery.input(TaskFilterSchema).output(PageOf(TaskSchema)) {
	async query(input, ctx) { ... }
}

class CreateTaskCommand extends ICommand.input(NewTaskSchema).output(TaskSchema) {
	async run(input, ctx) { ... }
}
```

`ctx` is `{ user, signal, host }`. A list is always a page: `PageInputSchema` in, `PageOf(Row)` out.

## How logic reaches other logic

| Needs                                                             | How                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| a handler of the same domain                                      | import it                                                           |
| a data source (vault, Supabase, an existing backend)              | import it from common                                               |
| a handler of another domain                                       | import it from that domain's `index.ts`, declared in `package.json` |
| something the app or host chooses (which storage, which provider) | a port, bound by the app _(planned: `.inject()`)_                   |

Only a widget always goes through a port, because a person or an app picks what answers it.

## Ports on a handler

**planned.** When the implementation is really swapped per app or host, a handler declares the port in its chain, the way a widget does:

```ts
class ExportBoardCommand extends ICommand
	.input(BoardRefSchema)
	.output(FileRefSchema)
	.inject({ files: IFiles }) {
	async run(input, { ports }) { ... }
}
```

Why not the constructor: TypeScript types are erased at runtime, and the engine must read what a handler needs before it builds one. A port is a zod value, so it can be read.

## Server handlers

**planned.** A handler that holds a secret is marked in its code:

```ts
class ChargeCardCommand extends ICommand.server().input(CardSchema).output(ReceiptSchema) {
	async run(input, { secrets }) { ... }
}
```

- `secrets` exists only in the `ctx` of a `.server()` handler.
- The build replaces a `.server()` class in a browser bundle with a stub that calls `/rpc/<port>`. The widget calls the same port and sees no difference.
- A host with no server refuses a `.server()` handler at build time.

## Services

**planned.** A service is a class with `start(ctx)` and `stop()`. The app lists the services it runs. A service never draws and is never called by a widget; a widget sees its work only through a query.
