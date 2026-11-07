# Layer responsibilities — hard rules

Every layer has one job. A file that does another layer's job is a defect, whatever the tests say;
a review that finds one sends the change back. These are definitions, not advice.

| Layer                                                                | Its job                                                                                                                                                                                                                                                                            | Never                                                                                                                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Handler** (`features/<f>/requests.ts`, the `.handle` of a request) | The business logic of one request: decides, checks the transition, refuses with a reason, computes through `lib`, reads and writes through gateways, logs `was → now`                                                                                                              | Its rules kept anywhere else: in a gateway, in a lib object with state. (A one-line handler is fine when there is no rule to apply)                           |
| **Gateway** (`gateways/<g>/`)                                        | Dumb access to one storage or outside system. Its operations are named for the data they read or write: `profile(userId)`, `saveProfile(profile)`, `settingsOf(userId)`, `tabsChanged(listener)`. May map, serialize, translate a storage error, handle a `null` the storage needs | A business rule, a transition, a choice of what to do, a call to another gateway. A generic `get`/`set`/`watch` API standing in for the data's own operations |
| **lib** (`features/<f>/lib/`, `shared/lib/`)                         | Pure functions: algorithms, transitions computed as values, filtering, formatting. Local variables and collections inside one call are fine                                                                                                                                        | State that outlives a call: a module-level or instance field, watchers, a cache. I/O. A gateway. A class holding data. The word `Store`                       |
| **Schema** (`shared/schema/`)                                        | zod shapes and the types inferred from them                                                                                                                                                                                                                                        | Logic, defaults with business meaning, I/O                                                                                                                    |
| **Module** (`module.ts`)                                             | Wiring: lists its requests, provides its gateways                                                                                                                                                                                                                                  | Logic of any kind                                                                                                                                             |
| **View** (a client package)                                          | Draws, keeps short-lived UI state (hover, drag, animation), reads with `useQuery`, writes with `useCommand`                                                                                                                                                                        | A business rule, a storage call, state that must survive a restart                                                                                            |

Heavy CPU work never runs in a handler or a subscriber on the main thread: it stands behind a gateway that hands it to a Web Worker, Rust (a Tauri command) or the server, and the handler awaits the result. Awaiting I/O does not block the UI.

When two handlers of one feature need the same computation, it is a pure function in that feature's `lib/`
(`features/frame-sides/lib/side-looks.ts`, used by toggle, peek and conceal), never repeated in each handler
nor hidden in a gateway; `shared/lib/` holds what two features use.

**Bad: the handler forwards, a "store" in lib owns the state and the rules** (`packages/state/layout`, 2026-10-24):

```ts
export const ToggleFrameSideCommand = command("toggle-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ side }, { frameSidesStore }) => frameSidesStore.toggle(side));

export class FrameSidesStore {
	private readonly watchers = new Set<() => void>();
	private sides: FrameSides;

	toggle(side: FrameSide): void {
		const was = this.sides[side];
		if (!ALLOWED_TURNS[was].includes(TOGGLED[was])) {
			throw new Error(`cannot turn ${was}`);
		}
		this.sides = { ...this.sides, [side]: TOGGLED[was] };
		for (const changed of this.watchers) {
			changed();
		}
	}
}
```

Three defects at once: the handler decides nothing, `lib` holds state and watchers, and the rule
(`ALLOWED_TURNS`) lives outside the handler, so no reader of `requests.ts` can see it.

**Bad: the gateway decides** (`TauriWorkingFolder.pickAnother`, 2026-10-23):

```ts
async pickAnother(): Promise<void> {
	const picked = await this.workspaces.attachFolder(this.entry.id);
	if (picked === null) {
		return;
	}
	this.become(picked, "picked another folder");
}
```

It opens a dialog, decides what an empty answer means, keeps the current folder and notifies
watchers: a whole feature inside an adapter, while its handler is one line.

**Bad: a generic API instead of the data's own operations.**

```ts
export abstract class UserGateway {
	abstract get(): unknown;
	abstract set(value: unknown): void;
	abstract watch(changed: () => void): () => void;
}
```

**Good: the handler holds the rule, `lib` computes, the gateway stores.**

```ts
export const ToggleFrameSideCommand = command("toggle-frame-side")
	.input(FrameSideInputSchema)
	.idempotencyKey(Repeatable)
	.handle(({ side }, { frameSides }) => {
		const sides = frameSides.sides();
		const next = toggledLook(sides[side]);
		const refusal = refuseTurn(sides[side], next);

		if (refusal !== null) {
			return refuse(refusal);
		}

		frameSides.saveSides({ ...sides, [side]: next }, `${side} ${sides[side]} → ${next} (toggle)`);
	});

export function toggledLook(look: SideLook): SideLook {
	return look === "docked" ? "hidden" : "docked";
}

export abstract class FrameSidesGateway {
	abstract sides(): FrameSides;
	abstract saveSides(sides: FrameSides, reason: string): void;
	abstract sidesChanged(listener: () => void): () => void;
}
```

**Good: a gateway over a user record, named for its data.**

```ts
export abstract class UsersGateway {
	abstract profile(userId: UserId): Promise<Profile | null>;
	abstract saveProfile(profile: Profile): Promise<void>;
	abstract settingsOf(userId: UserId): Promise<Settings>;
}
```

**The test is where the business logic lives, never how many lines a handler has.** When a request
only reads or only keeps a value, with no rule to apply, a one-line handler is correct:
`.handle((_input, { frameSides }) => frameSides.sides())` and
`.handle(({ note }, { notes }) => notes.saveNote(note))` are both fine, as long as the gateway behind
them only stores. A handler is wrong when the rule it owns sits somewhere else: a gateway method
that decides (`pickAnother`), or a lib object that keeps state and checks transitions (the old
`FrameSidesStore.toggle`).

Before writing a handler, read the method it calls: if that method decides anything, the logic is
somewhere it must not be.
