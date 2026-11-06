# Requests, handlers, guards

Logic lives in handlers. A request is a contract (`query` or `command`), a handler answers it, a module defines where its handlers run. Everything is imported from `@widgetarium/framework`, and every declaration is a fluent chain: one concern per call, in the order it runs, every behaviour ending in `.handle()`.

**A module is named `<Domain><Side>Module`, and a handler names its module**: `handler(PricesQuery, ShopServerModule)` shows in the handler file that it runs on the server. `module.ts` holds only the definition; `widgetarium generate` joins it with every exported `*Handler` into `generated/module.ts`.

**`.handle` exists only once something decides who may call.** A handler of a server module with no guard is a draft: it must pass `.guard(PublicGuard)`, `AuthenticatedGuard`, `HasPermissionGuard` or a guard that `.needsUser()` before `.handle()`, and tsc says so. A guard that only checks the input (`guard<In>()`) is not enough on its own. A server module that guards itself covers every handler it defines; a client module's handlers take only input guards.

## Public

Anyone may ask. `PublicGuard` is written, never implied.

```ts
import { z } from "zod";
import { PublicGuard, handler, query, serverModule } from "@widgetarium/framework";

const PriceSchema = z.object({ sku: z.string(), cents: z.number() });

export abstract class Prices {
	abstract all(): Promise<z.infer<typeof PriceSchema>[]>;
}

class FixedPrices extends Prices {
	override async all(): Promise<z.infer<typeof PriceSchema>[]> {
		return [];
	}
}

export const ShopServerModule = serverModule("shop").provide(() => ({ prices: new FixedPrices() }));

export const PricesQuery = query("shop/prices").output(z.array(PriceSchema));

export const PricesQueryHandler = handler(PricesQuery, ShopServerModule)
	.guard(PublicGuard)
	.inject({ prices: Prices })
	.handle((_input, { prices }) => prices.all());
```

## Signed in

`AuthenticatedGuard` refuses a call with no user and gives the handler `user: User`, never `null`. On the module, it covers every handler.

```ts
import { z } from "zod";
import { AuthenticatedGuard, handler, query, serverModule } from "@widgetarium/framework";

export abstract class Orders {
	abstract ofUser(userId: string): Promise<string[]>;
}

class NoOrders extends Orders {
	override async ofUser(): Promise<string[]> {
		return [];
	}
}

export const OrdersServerModule = serverModule("orders")
	.guard(AuthenticatedGuard)
	.provide(() => ({ orders: new NoOrders() }));

export const MyOrdersQuery = query("orders/my-orders").output(z.array(z.string()));

export const MyOrdersQueryHandler = handler(MyOrdersQuery, OrdersServerModule)
	.inject({ orders: Orders })
	.handle((_input, { orders, user }) => orders.ofUser(user.id));
```

## Ownership

Module guards decide identity only. A guard that resolves a record stays on the handler: it checks the owner, refuses with `deny`, and returns the record; the handler reads it from the context, never by the id in the input.

```ts
import { z } from "zod";
import { AuthenticatedGuard, PerCall, command, deny, guard, handler, serverModule } from "@widgetarium/framework";

interface Invoice {
	readonly id: string;
	readonly ownerId: string;
	readonly cents: number;
}

export abstract class Invoices {
	abstract byId(id: string): Promise<Invoice | null>;
}

export abstract class Payments {
	abstract pay(invoice: Invoice, idempotencyKey: string | null): Promise<{ paid: number }>;
}

declare const invoices: Invoices;
declare const payments: Payments;

export const BillingServerModule = serverModule("billing")
	.guard(AuthenticatedGuard)
	.provide(() => ({ invoices, payments }));

export const OwnsInvoiceGuard = guard<{ readonly invoiceId: string }>()
	.inject({ invoices: Invoices })
	.handle(async ({ input, context }, { invoices }) => {
		const invoice = await invoices.byId(input.invoiceId);
		if (invoice === null || invoice.ownerId !== context.user?.id) return deny("not your invoice");
		return { invoice };
	});

export const PayInvoiceCommand = command("billing/pay-invoice")
	.idempotencyKey(PerCall)
	.input(z.object({ invoiceId: z.string() }))
	.output(z.object({ paid: z.number() }));

export const PayInvoiceCommandHandler = handler(PayInvoiceCommand, BillingServerModule)
	.guard(OwnsInvoiceGuard)
	.inject({ payments: Payments })
	.handle((_input, { payments, invoice, idempotencyKey }) => payments.pay(invoice, idempotencyKey));
```

## Middleware

A middleware wraps the rest of the chain with `next()` and returns its answer; it never answers for the handler, because an answer not obtained from `next()` is refused. A module `.use`s one for all its handlers, and those run before the handler's own.

```ts
import { z } from "zod";
import { PublicGuard, handler, middleware, query, serverModule } from "@widgetarium/framework";

export abstract class Logger {
	abstract timed(request: string, ms: number): void;
}

class ConsoleLogger extends Logger {
	override timed(request: string, ms: number): void {
		console.info(request, ms);
	}
}

export const TimingLoggerMiddleware = middleware()
	.inject({ logger: Logger })
	.handle(async ({ request }, { logger }, next) => {
		const startedAt = Date.now();
		const answer = await next();
		logger.timed(request, Date.now() - startedAt);
		return answer;
	});

export const OpsServerModule = serverModule("ops")
	.guard(PublicGuard)
	.use(TimingLoggerMiddleware)
	.provide(() => ({ logger: new ConsoleLogger() }));

export const HealthQuery = query("ops/health").output(z.literal("ok"));

export const HealthQueryHandler = handler(HealthQuery, OpsServerModule).handle(() => "ok" as const);
```
