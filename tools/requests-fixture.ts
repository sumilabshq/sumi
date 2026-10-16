import { z } from "zod";
import {
	AuthenticatedGuard,
	HasPermissionGuard,
	PerCall,
	PublicGuard,
	Repeatable,
	command,
	guard,
	handler,
	minutes,
	module,
	permission,
	query,
	refuse,
} from "../packages/core/src/requests/index.ts";
import type { User } from "../packages/core/src/requests/index.ts";
import { Authenticate } from "../packages/core/src/requests/server/index.ts";

export const PagesPermissions = { rename: permission("pages.rename") };

export abstract class Pages {
	abstract list(prefix: string): readonly string[];
	abstract add(title: string): number;
	abstract rename(from: string, to: string): number;
}

export class MemoryPages extends Pages {
	readonly titles: string[];
	readonly runs: string[] = [];

	constructor(seed: readonly string[] = ["Home"]) {
		super();
		this.titles = [...seed];
	}

	override list(prefix: string): readonly string[] {
		this.runs.push(`list ${prefix}`);
		return this.titles.filter((title) => title.startsWith(prefix));
	}

	override add(title: string): number {
		this.runs.push(`add ${title}`);
		this.titles.push(title);
		return this.titles.length;
	}

	override rename(from: string, to: string): number {
		this.runs.push(`rename ${from}`);
		const at = this.titles.indexOf(from);
		if (at < 0) throw new Error(`no page ${from}`);
		this.titles[at] = to;
		return this.titles.length;
	}
}

export const gate = { open: (): void => undefined, opened: Promise.resolve() };

export function shutGate(): void {
	gate.opened = new Promise((opened) => {
		gate.open = opened;
	});
}

export const traced: string[] = [];

export const TracingGuard = guard({
	check: () => {
		traced.push("guard");
		return null;
	},
});

export const ThrowingGuard = guard({
	check: () => {
		throw new Error("the guard broke");
	},
});

const FromSchema = z.object({ from: z.string() });

export const KnownPageGuard = guard({
	inject: { pages: Pages },
	check: ({ request, input }, { pages }) => {
		const from = FromSchema.safeParse(input);
		if (from.success && pages.list("").includes(from.data.from)) return null;
		return { code: "refused-by-guard", reason: `${request}: no such page` };
	},
});

export const PagesQuery = query("pages/pages")
	.guard(PublicGuard)
	.input(z.object({ prefix: z.string() }))
	.output(z.array(z.string()));

export const CountQuery = query("pages/count").guard(PublicGuard).settlesNow().output(z.number());

export const SlowQuery = query("pages/slow").guard(PublicGuard).output(z.string());

export const CrashQuery = query("pages/crash").guard(PublicGuard).output(z.string());

export const BadOutputQuery = query("pages/bad-output").guard(PublicGuard).output(z.string().min(10));

export const AddPageCommand = command("pages/add-page")
	.guard(PublicGuard)
	.idempotencyKey(PerCall)
	.input(z.object({ title: z.string().min(1) }))
	.output(z.object({ count: z.number() }));

export const RenamePageCommand = command("pages/rename-page")
	.guard(AuthenticatedGuard)
	.guard(HasPermissionGuard(PagesPermissions.rename))
	.guard(KnownPageGuard)
	.input(z.object({ from: z.string(), to: z.string() }))
	.idempotencyKey(({ from, to }) => [from, to].join(" to "))
	.output(z.object({ count: z.number() }))
	.invalidates([PagesQuery]);

export const BumpCommand = command("pages/bump").guard(PublicGuard).idempotencyKey(Repeatable).output(z.number());

export const TouchPagesCommand = command("pages/touch-pages")
	.guard(PublicGuard)
	.idempotencyKey(Repeatable)
	.input(z.object({ title: z.string() }))
	.invalidates([PagesQuery]);

export const CrashCommand = command("pages/crash-command").guard(PublicGuard).idempotencyKey(Repeatable);

export const GuardCrashQuery = query("pages/guard-crash").guard(ThrowingGuard).output(z.string());

export const LimitedQuery = query("pages/limited")
	.guard(PublicGuard)
	.rateLimit({ calls: 2, per: minutes(1) })
	.output(z.number());

export const TracedCommand = command("pages/traced")
	.guard(AuthenticatedGuard)
	.guard(TracingGuard)
	.rateLimit({ calls: 5, per: minutes(1) })
	.idempotencyKey(PerCall)
	.output(z.string());

export const WhoQuery = query("pages/who").guard(AuthenticatedGuard).output(z.string());

export const StampCommand = command("pages/stamp")
	.guard(AuthenticatedGuard)
	.input(z.object({ note: z.string() }))
	.idempotencyKey(({ note }) => note)
	.output(z.string());

export const RefusingCommand = command("pages/refusing").guard(PublicGuard).idempotencyKey(PerCall);

export const BrokenCountQuery = query("pages/broken-count").guard(PublicGuard).settlesNow().output(z.number());

export const counted = { bumps: 0, refusals: 0, stamps: 0 };

export const pagesHandler = handler(PagesQuery, {
	inject: { pages: Pages },
	run: ({ prefix }, { pages }) => [...pages.list(prefix)],
	watch: (_input, { pages }, changed) => watchedPages(pages, changed),
});

export const countHandler = handler(CountQuery, {
	inject: { pages: Pages },
	run: (_input, { pages }) => pages.list("").length,
});

export const slowHandler = handler(SlowQuery, {
	run: async () => {
		await gate.opened;
		return "slow answer";
	},
});

export const crashHandler = handler(CrashQuery, {
	run: () => {
		throw new TypeError("cannot read the page");
	},
});

export const badOutputHandler = handler(BadOutputQuery, {
	run: () => "short",
});

export const addPageHandler = handler(AddPageCommand, {
	inject: { pages: Pages },
	run: async ({ title }, { pages }) => {
		await gate.opened;
		return { count: pages.add(title) };
	},
});

export const renamePageHandler = handler(RenamePageCommand, {
	inject: { pages: Pages },
	run: ({ from, to }, { pages }) => ({ count: pages.rename(from, to) }),
});

export const bumpHandler = handler(BumpCommand, {
	run: () => {
		counted.bumps += 1;
		return counted.bumps;
	},
});

export const touchPagesHandler = handler(TouchPagesCommand, {
	inject: { pages: Pages },
	run: ({ title }, { pages }) => void pages.add(title),
});

export const crashCommandHandler = handler(CrashCommand, {
	run: () => {
		throw new Error("the write broke halfway");
	},
});

export const guardCrashHandler = handler(GuardCrashQuery, { run: () => "never" });

export const limitedHandler = handler(LimitedQuery, { run: () => 1 });

export const whoHandler = handler(WhoQuery, {
	run: async (_input, { user }) => {
		await gate.opened;
		return user?.id ?? "nobody";
	},
});

export const stampHandler = handler(StampCommand, {
	run: (_input, { user }) => {
		counted.stamps += 1;
		return user?.id ?? "nobody";
	},
});

export const refusingHandler = handler(RefusingCommand, {
	run: () => {
		counted.refusals += 1;
		refuse("the page is not there yet");
	},
});

export const brokenCountHandler = handler(BrokenCountQuery, {
	run: () => {
		throw new Error("the count broke");
	},
});

export const tracedHandler = handler(TracedCommand, {
	run: () => {
		traced.push("handler");
		return "traced";
	},
});

const watchers = new Map<Pages, Set<() => void>>();

function watchedPages(pages: Pages, changed: () => void): () => void {
	const held = watchers.get(pages) ?? new Set<() => void>();
	watchers.set(pages, held);
	held.add(changed);
	return () => void held.delete(changed);
}

export function pagesChanged(pages: Pages): void {
	for (const changed of [...(watchers.get(pages) ?? [])]) changed();
}

export const PAGE_HANDLERS = [
	pagesHandler,
	countHandler,
	slowHandler,
	crashHandler,
	addPageHandler,
	bumpHandler,
	limitedHandler,
	badOutputHandler,
	touchPagesHandler,
	crashCommandHandler,
	guardCrashHandler,
	refusingHandler,
	brokenCountHandler,
] as const;

export function pagesModuleOver(pages: Pages) {
	return module("pages", { runs: "client", handlers: PAGE_HANDLERS, provide: () => ({ pages }) });
}

export const serverPagesModule = module("pages", {
	runs: "server",
	handlers: [...PAGE_HANDLERS, renamePageHandler, tracedHandler, whoHandler, stampHandler],
	provide: ({ env }: { readonly env: Readonly<Record<string, string | undefined>> }) => ({
		pages: new MemoryPages(env["PAGES_SEED"]?.split(",") ?? ["Home"]),
	}),
});

export class HeaderAuthenticate extends Authenticate {
	override async userOf(headers: Headers): Promise<User | null> {
		const id = headers.get("x-user");
		if (id === null) return null;
		return { id, permissions: id === "editor" ? [PagesPermissions.rename] : [] };
	}
}
