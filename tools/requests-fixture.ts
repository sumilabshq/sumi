import { z } from "zod";
import {
	AuthenticatedGuard,
	HasPermissionGuard,
	PerCall,
	PublicGuard,
	Repeatable,
	clientModule,
	command,
	deny,
	guard,
	handler,
	middleware,
	minutes,
	permission,
	query,
	rateLimit,
	refuse,
	serverModule,
} from "../packages/shared/core/src/requests/index.ts";
import type { AnyRequest, Handler, User } from "../packages/shared/core/src/requests/index.ts";
import { Authenticate } from "../packages/shared/core/src/requests/server/index.ts";

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

export const TracingGuard = guard().handle(() => {
	traced.push("guard");
});

export const ThrowingGuard = guard().handle(() => {
	throw new Error("the guard broke");
});

export const KnownPageGuard = guard<{ readonly from: string }>()
	.inject({ pages: Pages })
	.handle(({ request, input }, { pages }) => {
		if (!pages.list("").includes(input.from)) deny(`${request}: no such page`);
		return { known: input.from };
	});

export const PagesQuery = query("pages/pages")
	.input(z.object({ prefix: z.string() }))
	.output(z.array(z.string()));

export const CountQuery = query("pages/count").settlesNow().output(z.number());

export const SlowQuery = query("pages/slow").output(z.string());

export const CrashQuery = query("pages/crash").output(z.string());

export const BadOutputQuery = query("pages/bad-output").output(z.string().min(10));

export const AddPageCommand = command("pages/add-page")
	.idempotencyKey(PerCall)
	.input(z.object({ title: z.string().min(1) }))
	.output(z.object({ count: z.number() }));

export const RenamePageCommand = command("pages/rename-page")
	.input(z.object({ from: z.string(), to: z.string() }))
	.idempotencyKey(({ from, to }) => [from, to].join(" to "))
	.output(z.object({ count: z.number() }))
	.invalidates([PagesQuery]);

export const BumpCommand = command("pages/bump").idempotencyKey(Repeatable).output(z.number());

export const TouchPagesCommand = command("pages/touch-pages")
	.idempotencyKey(Repeatable)
	.input(z.object({ title: z.string() }))
	.invalidates([PagesQuery]);

export const CrashCommand = command("pages/crash-command").idempotencyKey(Repeatable);

export const GuardCrashQuery = query("pages/guard-crash").output(z.string());

export const LimitedQuery = query("pages/limited").output(z.number());

export const TracedCommand = command("pages/traced").idempotencyKey(PerCall).output(z.string());

export const WhoQuery = query("pages/who").output(z.string());

export const StampCommand = command("pages/stamp")
	.input(z.object({ note: z.string() }))
	.idempotencyKey(({ note }) => note)
	.output(z.string());

export const RefusingCommand = command("pages/refusing").idempotencyKey(PerCall);

export const BrokenCountQuery = query("pages/broken-count").settlesNow().output(z.number());

export const SecretQuery = query("pages/secret").output(z.string());

export const WhoElseQuery = query("pages/who-else").output(z.string());

export const PayCommand = command("pages/pay")
	.idempotencyKey(PerCall)
	.input(z.object({ n: z.number() }))
	.output(z.number());

export const NoteCommand = command("pages/note")
	.input(z.object({ note: z.string() }))
	.idempotencyKey(({ note }) => note)
	.output(z.number());

export const MineQuery = query("pages/mine").output(z.string());

export const counted = { bumps: 0, refusals: 0, stamps: 0, pays: 0, notes: 0 };

export const PagesClientModule = clientModule("pages").provide((pages: Pages) => ({ pages }));

const PAGES = { pages: Pages } as const;

export const PagesQueryHandler = handler(PagesQuery, PagesClientModule)
	.inject(PAGES)
	.watch((_input, { pages }, changed) => watchedPages(pages, changed))
	.handle(({ prefix }, { pages }) => [...pages.list(prefix)]);

export const CountQueryHandler = handler(CountQuery, PagesClientModule)
	.inject(PAGES)
	.handle((_input, { pages }) => pages.list("").length);

export const SlowQueryHandler = handler(SlowQuery, PagesClientModule)
	.inject(PAGES)
	.handle(async () => {
		await gate.opened;
		return "slow answer";
	});

export const CrashQueryHandler = handler(CrashQuery, PagesClientModule)
	.inject(PAGES)
	.handle(() => {
		throw new TypeError("cannot read the page");
	});

export const BadOutputQueryHandler = handler(BadOutputQuery, PagesClientModule)
	.inject(PAGES)
	.handle(() => "short");

export const AddPageCommandHandler = handler(AddPageCommand, PagesClientModule)
	.inject(PAGES)
	.handle(async ({ title }, { pages }) => {
		await gate.opened;
		return { count: pages.add(title) };
	});

export const BumpCommandHandler = handler(BumpCommand, PagesClientModule)
	.inject(PAGES)
	.handle(() => {
		counted.bumps += 1;
		return counted.bumps;
	});

export const TouchPagesCommandHandler = handler(TouchPagesCommand, PagesClientModule)
	.inject(PAGES)
	.handle(({ title }, { pages }) => void pages.add(title));

export const CrashCommandHandler = handler(CrashCommand, PagesClientModule)
	.inject(PAGES)
	.handle(() => {
		throw new Error("the write broke halfway");
	});

export const GuardCrashQueryHandler = handler(GuardCrashQuery, PagesClientModule)
	.inject(PAGES)
	.handle(() => "never");

export const LimitedQueryHandler = handler(LimitedQuery, PagesClientModule)
	.inject(PAGES)
	.handle(() => 1);

export const RefusingCommandHandler = handler(RefusingCommand, PagesClientModule)
	.inject(PAGES)
	.handle(() => {
		counted.refusals += 1;
		refuse("the page is not there yet");
	});

export const BrokenCountQueryHandler = handler(BrokenCountQuery, PagesClientModule)
	.inject(PAGES)
	.handle(() => {
		throw new Error("the count broke");
	});

export const PAGE_HANDLERS = [
	PagesQueryHandler,
	CountQueryHandler,
	SlowQueryHandler,
	CrashQueryHandler,
	AddPageCommandHandler,
	BumpCommandHandler,
	LimitedQueryHandler,
	BadOutputQueryHandler,
	TouchPagesCommandHandler,
	CrashCommandHandler,
	GuardCrashQueryHandler,
	RefusingCommandHandler,
	BrokenCountQueryHandler,
] as const;

export function pagesModuleOver(pages: Pages) {
	return PagesClientModule.handlers(PAGE_HANDLERS).with(pages);
}

export const PagesServerModule = serverModule("pages").provide(({ env }) => ({
	pages: new MemoryPages(env["PAGES_SEED"]?.split(",") ?? ["Home"]),
}));

export const RenamePageCommandHandler = handler(RenamePageCommand, PagesServerModule)
	.guard(AuthenticatedGuard)
	.guard(HasPermissionGuard(PagesPermissions.rename))
	.guard(KnownPageGuard)
	.inject(PAGES)
	.handle(({ from, to }, { pages }) => ({ count: pages.rename(from, to) }));

export const WhoQueryHandler = handler(WhoQuery, PagesServerModule)
	.guard(AuthenticatedGuard)
	.handle(async (_input, { user }) => {
		await gate.opened;
		return user.id;
	});

export const StampCommandHandler = handler(StampCommand, PagesServerModule)
	.guard(AuthenticatedGuard)
	.handle((_input, { user }) => {
		counted.stamps += 1;
		return user.id;
	});

export const TracedCommandHandler = handler(TracedCommand, PagesServerModule)
	.guard(AuthenticatedGuard)
	.guard(TracingGuard)
	.use(rateLimit({ calls: 5, per: minutes(1) }))
	.handle(() => {
		traced.push("handler");
		return "traced";
	});

export const STARTED_AT = 7;

export const WrappingMiddleware = middleware()
	.adds<{ readonly startedAt: number }>()
	.handle(async (_call, _deps, next) => {
		traced.push("before");
		const answer = await next({ startedAt: STARTED_AT });
		traced.push("after");
		return answer;
	});

export const ContextQuery = query("pages/context").output(z.object({ user: z.string(), startedAt: z.number() }));

export const ContextQueryHandler = handler(ContextQuery, PagesServerModule)
	.guard(AuthenticatedGuard)
	.use(WrappingMiddleware)
	.handle((_input, { user, startedAt }) => {
		traced.push("handler");
		return { user: user.id, startedAt };
	});

export const AnsweringMiddleware = middleware().handle(async () => ({ ok: true, output: "from the step" }));

export const SecretQueryHandler = handler(SecretQuery, PagesServerModule)
	.use(AnsweringMiddleware)
	.guard(AuthenticatedGuard)
	.handle(() => "secret");

export const IMPERSONATED: User = { id: "admin", permissions: [] };

export const ImpersonatingGuard = guard().handle(() => ({ user: IMPERSONATED }));

export const WhoElseQueryHandler = handler(WhoElseQuery, PagesServerModule)
	.guard(ImpersonatingGuard)
	.guard(AuthenticatedGuard)
	.handle((_input, { user }) => user.id);

export const BreakingAfterMiddleware = middleware().handle(async (_call, _deps, next) => {
	await next();
	throw new Error("the logger broke");
});

export const PayCommandHandler = handler(PayCommand, PagesServerModule)
	.use(BreakingAfterMiddleware)
	.guard(AuthenticatedGuard)
	.handle(({ n }) => {
		counted.pays += 1;
		return n;
	});

export const NoteCommandHandler = handler(NoteCommand, PagesServerModule)
	.guard(PublicGuard)
	.handle(() => {
		counted.notes += 1;
		return counted.notes;
	});

export const SignedOnlyGuard = guard()
	.needsUser()
	.handle(({ context }) => ({ owner: context.user?.id ?? "" }));

export const MineQueryHandler = handler(MineQuery, PagesServerModule)
	.guard(SignedOnlyGuard)
	.handle((_input, { owner }) => owner);

export const ModuleTracingMiddleware = middleware().handle(async (_call, _deps, next) => {
	traced.push("module use");
	return next();
});

export const HandlerTracingMiddleware = middleware().handle(async (_call, _deps, next) => {
	traced.push("handler use");
	return next();
});

export const OrderedCommand = command("ordered/ordered")
	.input(z.object({ note: z.string() }))
	.idempotencyKey(({ note }) => note)
	.output(z.string());

export const OrderedServerModule = serverModule("ordered").use(ModuleTracingMiddleware).guard(AuthenticatedGuard);

export const OrderedCommandHandler = handler(OrderedCommand, OrderedServerModule)
	.use(HandlerTracingMiddleware)
	.handle((_input, { user }) => {
		traced.push("handle");
		return user.id;
	});

export const JoinedOrderedServerModule = OrderedServerModule.handlers([OrderedCommandHandler]);

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

export function servedPublicly<R extends AnyRequest>(
	local: Handler<R, typeof PAGES, "client">,
): Handler<R, typeof PAGES, "public"> {
	const served = handler(local.request, PagesServerModule).guard(PublicGuard).inject(PAGES);
	const watched = local.watch === null ? served : served.watch(local.watch);
	return watched.handle((input, context) => local.handle(input, context));
}

export const ServedLimitedQueryHandler = handler(LimitedQuery, PagesServerModule)
	.guard(PublicGuard)
	.use(rateLimit({ calls: 2, per: minutes(1) }))
	.handle(() => 1);

export const ServedGuardCrashQueryHandler = handler(GuardCrashQuery, PagesServerModule)
	.guard(PublicGuard)
	.guard(ThrowingGuard)
	.handle(() => "never");

export const SERVED_PAGE_HANDLERS = [
	servedPublicly(PagesQueryHandler),
	servedPublicly(CountQueryHandler),
	servedPublicly(SlowQueryHandler),
	servedPublicly(CrashQueryHandler),
	servedPublicly(AddPageCommandHandler),
	servedPublicly(BumpCommandHandler),
	ServedLimitedQueryHandler,
	servedPublicly(BadOutputQueryHandler),
	servedPublicly(TouchPagesCommandHandler),
	servedPublicly(CrashCommandHandler),
	ServedGuardCrashQueryHandler,
	servedPublicly(RefusingCommandHandler),
	servedPublicly(BrokenCountQueryHandler),
	RenamePageCommandHandler,
	TracedCommandHandler,
	WhoQueryHandler,
	StampCommandHandler,
	ContextQueryHandler,
	SecretQueryHandler,
	WhoElseQueryHandler,
	PayCommandHandler,
	NoteCommandHandler,
	MineQueryHandler,
] as const;

export const JoinedPagesServerModule = PagesServerModule.handlers(SERVED_PAGE_HANDLERS);

export class HeaderAuthenticate extends Authenticate {
	override async userOf(headers: Headers): Promise<User | null> {
		const id = headers.get("x-user");
		if (id === null) return null;
		return { id, permissions: id === "editor" ? [PagesPermissions.rename] : [] };
	}
}
