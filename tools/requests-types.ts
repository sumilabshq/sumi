import { z } from "zod";
import {
	AuthenticatedGuard,
	HasPermissionGuard,
	PerCall,
	PublicGuard,
	command,
	handler,
	module,
	query,
	seconds,
} from "../packages/core/src/requests/index.ts";
import * as fx from "./requests-fixture.ts";

export function typedOnly(): void {
	const Unguarded = query("pages/unguarded").output(z.string());
	module("pages", { runs: "client", handlers: [handler(Unguarded, { run: () => "" })] });
	// @ts-expect-error
	module("pages", { runs: "server", handlers: [handler(Unguarded, { run: () => "" })] });

	// @ts-expect-error
	query("pages/x").guard(PublicGuard).guard(AuthenticatedGuard);

	// @ts-expect-error
	query("pages/x").guard(AuthenticatedGuard).guard(PublicGuard);

	const Unkeyed = command("pages/unkeyed").guard(PublicGuard);
	// @ts-expect-error
	handler(Unkeyed, { run: () => undefined });

	// @ts-expect-error
	query("pages/x").guard(PublicGuard).idempotencyKey(PerCall);

	// @ts-expect-error
	command("pages/x").guard(PublicGuard).idempotencyKey(PerCall).idempotencyKey(PerCall);

	// @ts-expect-error
	query("pages/x").guard(PublicGuard).cache({ freshFor: 5000 });

	query("pages/x")
		.guard(PublicGuard)
		.cache({ freshFor: seconds(5) });

	// @ts-expect-error
	HasPermissionGuard("pages.rename");

	// @ts-expect-error
	handler(fx.PagesQuery, { run: () => 3 });

	// @ts-expect-error
	module("pages", { runs: "client", handlers: [fx.pagesHandler], provide: () => ({}) });

	// @ts-expect-error
	fx.pagesHandler.run({ prefix: "" }, {});

	fx.pagesHandler.run({ prefix: "" }, { pages: new fx.MemoryPages() });

	// @ts-expect-error
	command("pages/x")
		.guard(PublicGuard)
		.idempotencyKey(PerCall)
		.cache({ freshFor: seconds(1) });

	// @ts-expect-error
	query("pages/x").guard(PublicGuard).invalidates([fx.PagesQuery]);
}
