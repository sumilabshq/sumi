import { z } from "zod";
import {
	app,
	command,
	handlerOf,
	module,
	provided,
	query,
	useCommand,
	useQuery,
} from "../packages/core/src/mediator/index.ts";
import type { AnyHost, App, InputOf } from "../packages/core/src/mediator/index.ts";
import { PagesQuery, PlatformQuery, Pages } from "./mediator-fixture.ts";

const NoKey = command("canvas/no-key").input(z.object({ title: z.string() }));
const NoOutput = query("canvas/no-output").input(z.object({ title: z.string() }));
const SameShape = query("canvas/same-shape").output(z.string());

// @ts-expect-error a command without idempotencyKey is not a request a handler can handle
export const HandlerOfNoKey = handlerOf(NoKey);

export function sendsNoKey(app: App): unknown {
	// @ts-expect-error a command without idempotencyKey cannot be sent
	return app.send(NoKey, { title: "x" });
}

export function drawsNoKey(): unknown {
	// @ts-expect-error a command without idempotencyKey cannot be used in a view
	return useCommand(NoKey);
}

export function readsNoOutput(): unknown {
	// @ts-expect-error a query without output cannot be read
	return useQuery(NoOutput, { title: "x" });
}

export function sendsWrongInput(app: App): unknown {
	// @ts-expect-error the input is the request's input schema
	return app.send(PagesQuery, { prefix: 1 });
}

export class WrongReturnHandler extends handlerOf(PlatformQuery) {
	// @ts-expect-error a handler returns its request's output
	override async handle(): Promise<number> {
		return 1;
	}
}

export class WrongInputHandler extends handlerOf(PagesQuery) {
	// @ts-expect-error a handler takes its request's input
	override async handle({ prefix }: { prefix: number }): Promise<string[]> {
		return [String(prefix)];
	}
}

class HandWrittenHandler {
	static readonly request = SameShape;
	async handle(): Promise<string> {
		return "web";
	}
}

export const moduleWithHandWritten = module({
	name: "canvas",
	// @ts-expect-error a module takes only handlers made by handlerOf
	handlers: [HandWrittenHandler],
});

export class TypedInputHandler extends handlerOf(PagesQuery) {
	override async handle({ prefix }: InputOf<typeof PagesQuery>): Promise<string[]> {
		return [prefix];
	}
}

// @ts-expect-error a provided value is what its token promises
export const providesNumber = provided(Pages, { web: () => 1 });

// @ts-expect-error a provided value carries every member of its token
export const providesHalf = provided(Pages, { web: () => ({ platform: "web", list: () => [] }) });

export const providesPages = provided(Pages, {
	web: (host) => ({ platform: host.project.app.name, list: () => [], add: () => 0 }),
	server: (host) => ({ platform: host.env["REGION"] ?? "server", list: () => [], add: () => 0 }),
});

export const readsTheWrongHost = provided(Pages, {
	// @ts-expect-error each factory gets its own platform's host: a mobile host has no project
	mobile: (host) => ({ platform: host.project.app.name, list: () => [], add: () => 0 }),
});

// @ts-expect-error a provided value is a record per platform, never one factory for all
export const providesOneFactory = provided(Pages, () => ({ platform: "any", list: () => [], add: () => 0 }));

const webOnly = module({ name: "canvas", handlers: [], provide: [providesPages] });

export function shipsWhereProvided(host: AnyHost): App {
	return app({ modules: [webOnly], platforms: ["web"], host });
}

export function shipsWhereNotProvided(host: AnyHost): App {
	// @ts-expect-error an app ships only to platforms every injected dependency is provided on
	return app({ modules: [webOnly], platforms: ["web", "obsidian"], host });
}

export function sendsFromAHandler(): unknown {
	return class extends handlerOf(PlatformQuery) {
		override async handle(): Promise<string> {
			const pages = await this.send(PagesQuery, { prefix: "" });
			// @ts-expect-error this.send answers the sent request's output, not the handler's
			const wrong: number = pages.ok ? pages.output : 0;
			return String(wrong);
		}
	};
}

export async function typedAnswer(app: App): Promise<readonly string[]> {
	const answer = await app.send(PagesQuery, { prefix: "" });
	return answer.ok ? answer.output : [];
}
