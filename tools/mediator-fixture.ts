import { z } from "zod";
import { command, inject, module, query, token } from "../packages/core/src/mediator/index.ts";
import type { AppHost, Handles, InputOf, Middleware, RequestContext } from "../packages/core/src/mediator/index.ts";

export interface Pages {
	readonly platform: string;
	list(): readonly string[];
	add(title: string): number;
}

export const Pages = token<Pages>("Pages");

class MemoryPages implements Pages {
	private readonly titles: string[] = ["Home"];
	constructor(readonly platform: string) {}
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

export const GetPages = query("canvas/get-pages")
	.input(z.object({ prefix: z.string() }))
	.output(z.array(z.string()));
export const GetPlatform = query("canvas/get-platform").output(z.string());
export const GetSlow = query("canvas/get-slow").output(z.string());
export const GetFailing = query("canvas/get-failing").output(z.string());
export const GetHalf = query("canvas/get-half").output(z.number().int());
export const AddPage = command("canvas/add-page")
	.input(z.object({ title: z.string().min(1) }))
	.output(z.object({ count: z.number() }))
	.idempotencyKey(({ title }) => title);
export const Bump = command("canvas/bump").idempotencyKey("none");
export const Save = command("canvas/save")
	.input(z.object({ text: z.string() }))
	.idempotencyKey("per-call");
export const Orphan = query("canvas/orphan").output(z.string());

export class GetPagesHandler implements Handles<typeof GetPages> {
	static readonly request = GetPages;
	private readonly pages = inject(Pages);
	async handle({ prefix }: InputOf<typeof GetPages>): Promise<string[]> {
		seen.order.push("handler");
		return this.pages.list().filter((title) => title.startsWith(prefix));
	}
}

export class GetPlatformHandler implements Handles<typeof GetPlatform> {
	static readonly request = GetPlatform;
	private readonly pages = inject(Pages);
	async handle(): Promise<string> {
		return this.pages.platform;
	}
}

export class GetSlowHandler implements Handles<typeof GetSlow> {
	static readonly request = GetSlow;
	async handle(): Promise<string> {
		await gate.shut;
		return "slow answer";
	}
}

export class GetFailingHandler implements Handles<typeof GetFailing> {
	static readonly request = GetFailing;
	async handle(): Promise<string> {
		throw new Error("the vault is gone");
	}
}

export class GetHalfHandler implements Handles<typeof GetHalf> {
	static readonly request = GetHalf;
	async handle(): Promise<number> {
		return 1.5;
	}
}

export class AddPageHandler implements Handles<typeof AddPage> {
	static readonly request = AddPage;
	private readonly pages = inject(Pages);
	async handle({ title }: InputOf<typeof AddPage>, ctx: RequestContext): Promise<{ count: number }> {
		seen.added += 1;
		seen.keys.push(ctx.idempotencyKey);
		return { count: this.pages.add(title) };
	}
}

export class BumpHandler implements Handles<typeof Bump> {
	static readonly request = Bump;
	async handle(_input: void, ctx: RequestContext): Promise<void> {
		seen.bumped += 1;
		seen.keys.push(ctx.idempotencyKey);
	}
}

export class SaveHandler implements Handles<typeof Save> {
	static readonly request = Save;
	async handle(_input: InputOf<typeof Save>, ctx: RequestContext): Promise<void> {
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
	requests: [GetPages, GetPlatform, GetSlow, GetFailing, GetHalf, AddPage, Bump, Save],
	handlers: [
		GetPagesHandler,
		GetPlatformHandler,
		GetSlowHandler,
		GetFailingHandler,
		GetHalfHandler,
		AddPageHandler,
		BumpHandler,
		SaveHandler,
	],
	provide: { [Pages]: (host: AppHost) => new MemoryPages(host.is("obsidian") ? "obsidian" : "web") },
	use: [traced("outer"), traced("inner")],
});

export function hostOn(platform: string): AppHost {
	return { is: (asked) => asked === platform };
}
