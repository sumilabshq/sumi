import { z } from "zod";
import { app, command, handlerOf, module, provided, query } from "../packages/core/src/mediator/index.ts";
import type {
	AnyHost,
	App,
	AppPlatform,
	InputOf,
	Middleware,
	Module,
	RequestContext,
} from "../packages/core/src/mediator/index.ts";
import { standIn } from "./stand-in.ts";

export abstract class Pages {
	abstract readonly platform: string;
	abstract list(): readonly string[];
	abstract add(title: string): number;
}

class MemoryPages extends Pages {
	private readonly titles: string[] = ["Home"];
	constructor(readonly platform: string) {
		super();
	}
	list(): readonly string[] {
		return [...this.titles];
	}
	add(title: string): number {
		this.titles.push(title);
		return this.titles.length;
	}
}

export const seen = { added: 0, bumped: 0, keys: new Array<string | null>(), order: new Array<string>() };
export const gate = { open: (): void => {}, shut: Promise.resolve() };

export function shutGate(): void {
	gate.shut = new Promise((opened) => {
		gate.open = opened;
	});
}

export const PagesQuery = query("canvas/pages")
	.input(z.object({ prefix: z.string() }))
	.output(z.array(z.string()));
export const PlatformQuery = query("canvas/platform").output(z.string());
export const SlowQuery = query("canvas/slow").output(z.string());
export const FailingQuery = query("canvas/failing").output(z.string());
export const HalfQuery = query("canvas/half").output(z.number().int());
export const AddPageCommand = command("canvas/add-page")
	.input(z.object({ title: z.string().min(1) }))
	.output(z.object({ count: z.number() }))
	.idempotencyKey(({ title }) => title);
export const BumpCommand = command("canvas/bump").idempotencyKey("none");
export const SaveCommand = command("canvas/save")
	.input(z.object({ text: z.string() }))
	.idempotencyKey("per-call");
export const OrphanQuery = query("canvas/orphan").output(z.string());

export class PagesQueryHandler extends handlerOf(PagesQuery) {
	private readonly pages = this.inject(Pages);
	override async handle({ prefix }: InputOf<typeof PagesQuery>): Promise<string[]> {
		seen.order.push("handler");
		return this.pages.list().filter((title) => title.startsWith(prefix));
	}
}

export class PlatformQueryHandler extends handlerOf(PlatformQuery) {
	private readonly pages = this.inject(Pages);
	override async handle(_input: void, ctx: RequestContext): Promise<string> {
		return `${this.pages.platform} on ${ctx.host.platform}`;
	}
}

export class SlowQueryHandler extends handlerOf(SlowQuery) {
	override async handle(): Promise<string> {
		await gate.shut;
		return "slow answer";
	}
}

export class FailingQueryHandler extends handlerOf(FailingQuery) {
	override async handle(): Promise<string> {
		throw new Error("the vault is gone");
	}
}

export class HalfQueryHandler extends handlerOf(HalfQuery) {
	override async handle(): Promise<number> {
		return 1.5;
	}
}

export class AddPageCommandHandler extends handlerOf(AddPageCommand) {
	private readonly pages = this.inject(Pages);
	override async handle({ title }: InputOf<typeof AddPageCommand>, ctx: RequestContext): Promise<{ count: number }> {
		seen.added += 1;
		seen.keys.push(ctx.idempotencyKey);
		return { count: this.pages.add(title) };
	}
}

export class BumpCommandHandler extends handlerOf(BumpCommand) {
	override async handle(_input: void, ctx: RequestContext): Promise<void> {
		seen.bumped += 1;
		seen.keys.push(ctx.idempotencyKey);
	}
}

export class SaveCommandHandler extends handlerOf(SaveCommand) {
	override async handle(_input: InputOf<typeof SaveCommand>, ctx: RequestContext): Promise<void> {
		seen.keys.push(ctx.idempotencyKey);
	}
}

const traced =
	(name: string): Middleware =>
	async (_call, next) => {
		seen.order.push(`${name}>`);
		const answered = await next();
		seen.order.push(`<${name}`);
		return answered;
	};

export const canvasModule = module({
	name: "canvas",
	handlers: [
		PagesQueryHandler,
		PlatformQueryHandler,
		SlowQueryHandler,
		FailingQueryHandler,
		HalfQueryHandler,
		AddPageCommandHandler,
		BumpCommandHandler,
		SaveCommandHandler,
	],
	provide: [
		provided(Pages, {
			obsidian: () => new MemoryPages("vault pages"),
			web: (host) => new MemoryPages(`${host.platform} pages`),
		}),
	],
	use: [traced("outer"), traced("inner")],
});

export function hostOn(platform: AppPlatform): AnyHost {
	return standIn<AnyHost>({ platform }, ["platform"], `${platform} host`);
}

export function onPlatform<T>(platform: AppPlatform, run: () => T): T {
	const before: unknown = Reflect.get(globalThis, "__WG_PLATFORM__");
	Reflect.set(globalThis, "__WG_PLATFORM__", platform);
	try {
		return run();
	} finally {
		Reflect.set(globalThis, "__WG_PLATFORM__", before);
	}
}

export function appOn(platform: AppPlatform, modules: readonly Module[]): App {
	return onPlatform(platform, () => app({ modules, platforms: [platform], host: hostOn(platform) }));
}
