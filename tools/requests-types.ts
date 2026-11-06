import { z } from "zod";
import {
	AuthenticatedGuard,
	HasPermissionGuard,
	PerCall,
	PublicGuard,
	clientModule,
	command,
	guard,
	handler,
	middleware,
	minutes,
	query,
	rateLimit,
	seconds,
	serverModule,
} from "../packages/shared/data-framework/src/index.ts";
import type { User } from "../packages/shared/data-framework/src/index.ts";
import * as fx from "./requests-fixture.ts";

const Plain = query("pages/plain").output(z.string());
const PlainClientModule = clientModule("pages");
const PlainServerModule = serverModule("pages");
const SignedServerModule = serverModule("pages").guard(AuthenticatedGuard);
const OpenServerModule = serverModule("pages").guard(PublicGuard);
const PlainClientHandler = handler(Plain, PlainClientModule).handle(() => "");
const PublicPlainHandler = handler(Plain, PlainServerModule)
	.guard(PublicGuard)
	.handle(() => "");
const TimedMiddleware = middleware()
	.adds<{ readonly startedAt: number }>()
	.handle((_call, _deps, next) => next({ startedAt: 0 }));
const startedAtAdded = middleware().adds<{ readonly startedAt: number }>();
const InputOnlyGuard = guard().handle(() => undefined);
const SignedOnlyGuard = guard()
	.needsUser()
	.handle(() => undefined);
const FROM_TO = { from: "Home", to: "Start" };

export function typedOnly(): void {
	const draft = handler(Plain, PlainServerModule);
	// @ts-expect-error
	draft.handle(() => "");
	// @ts-expect-error
	draft.use(TimedMiddleware).handle(() => "");
	// @ts-expect-error
	draft.guard(InputOnlyGuard).handle(() => "");
	draft
		.guard(InputOnlyGuard)
		.guard(PublicGuard)
		.handle(() => "");
	draft.guard(SignedOnlyGuard).handle(() => "");
	// @ts-expect-error
	handler(Plain, PlainClientModule).guard(PublicGuard);
	handler(Plain, PlainClientModule)
		.guard(InputOnlyGuard)
		.handle(() => "");
	// @ts-expect-error
	handler(Plain, PlainClientModule).guard(SignedOnlyGuard);
	// @ts-expect-error
	handler(Plain, PlainClientModule).use(TimedMiddleware);

	handler(Plain, SignedServerModule).handle((_input, { user }) => user.id);
	handler(Plain, OpenServerModule).handle(() => "");
	// @ts-expect-error
	handler(Plain, OpenServerModule).handle((_input, { user }) => user.id);
	// @ts-expect-error
	serverModule("pages").guard(PublicGuard).guard(AuthenticatedGuard);
	// @ts-expect-error
	serverModule("pages").guard(AuthenticatedGuard).guard(PublicGuard);
	// @ts-expect-error
	serverModule("pages").guard(fx.KnownPageGuard);
	// @ts-expect-error
	clientModule("pages").guard(PublicGuard);
	serverModule("pages")
		.use(TimedMiddleware)
		.use(rateLimit({ calls: 1, per: minutes(1) }));

	PlainClientModule.handlers([PlainClientHandler]);
	PlainServerModule.handlers([PublicPlainHandler]);
	// @ts-expect-error
	PlainServerModule.handlers([PlainClientHandler]);
	// @ts-expect-error
	PlainClientModule.handlers([PublicPlainHandler]);

	const publicly = handler(Plain, PlainServerModule).guard(PublicGuard);
	// @ts-expect-error
	publicly.guard(AuthenticatedGuard);
	// @ts-expect-error
	publicly.guard(SignedOnlyGuard);
	publicly.guard(InputOnlyGuard);
	publicly.use(rateLimit({ calls: 1, per: minutes(1) }));
	// @ts-expect-error
	handler(Plain, PlainServerModule).guard(AuthenticatedGuard).guard(PublicGuard);
	// @ts-expect-error
	handler(Plain, PlainServerModule).use(AuthenticatedGuard);
	// @ts-expect-error
	handler(Plain, PlainServerModule).guard(TimedMiddleware);

	handler(Plain, PlainServerModule)
		.guard(AuthenticatedGuard)
		.handle((_input, { user }) => user.id);
	// @ts-expect-error
	publicly.handle((_input, { user }) => user.id);

	handler(Plain, PlainServerModule)
		.guard(PublicGuard)
		.use(TimedMiddleware)
		.handle((_input, { startedAt }) => String(startedAt));
	// @ts-expect-error
	startedAtAdded.handle((_call, _deps, next) => next());
	// @ts-expect-error
	middleware().adds<{ readonly user: User }>();
	// @ts-expect-error
	middleware().adds<{ readonly idempotencyKey: string }>();

	handler(fx.RenamePageCommand, PlainServerModule)
		.guard(AuthenticatedGuard)
		.guard(fx.KnownPageGuard)
		.handle((_input, { known }) => ({ count: known.length }));
	// @ts-expect-error
	handler(Plain, PlainServerModule).guard(AuthenticatedGuard).guard(fx.KnownPageGuard);
	fx.RenamePageCommandHandler.handle(FROM_TO, {
		pages: new fx.MemoryPages(),
		user: { id: "u", permissions: [] },
		known: "Home",
	});

	// @ts-expect-error
	handler(Plain, fx.PagesClientModule).inject({ missing: fx.Pages, pages: fx.Pages });
	// @ts-expect-error
	handler(Plain, PlainClientModule).inject({ pages: fx.Pages });
	handler(Plain, fx.PagesClientModule).inject({ pages: fx.Pages });

	// @ts-expect-error
	query("pages/x").guard(PublicGuard);
	// @ts-expect-error
	command("pages/x").rateLimit({ calls: 1, per: minutes(1) });

	const Unkeyed = command("pages/unkeyed");
	// @ts-expect-error
	handler(Unkeyed, PlainServerModule);

	// @ts-expect-error
	query("pages/x").idempotencyKey(PerCall);
	// @ts-expect-error
	command("pages/x").idempotencyKey(PerCall).idempotencyKey(PerCall);
	// @ts-expect-error
	query("pages/x").cache({ freshFor: 5000 });
	query("pages/x").cache({ freshFor: seconds(5) });
	// @ts-expect-error
	command("pages/x")
		.idempotencyKey(PerCall)
		.cache({ freshFor: seconds(1) });
	// @ts-expect-error
	query("pages/x").invalidates([fx.PagesQuery]);

	// @ts-expect-error
	HasPermissionGuard("pages.rename");

	const pagesClient = handler(fx.PagesQuery, fx.PagesClientModule);
	// @ts-expect-error
	pagesClient.handle(() => 3);

	// @ts-expect-error
	fx.PagesQueryHandler.handle({ prefix: "" }, {});
	fx.PagesQueryHandler.handle({ prefix: "" }, { pages: new fx.MemoryPages() });
}
