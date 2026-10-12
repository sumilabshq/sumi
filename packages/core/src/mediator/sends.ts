import type { z } from "zod";
import type { CommandAnswer } from "../gateway/run-handler";
import type { AnyQuery, AnyRequest, OutputOf, SentOf } from "./request";
import type { QueryStore } from "./query-store";
import type { FailureReport } from "./report-failure";

export interface SendOptions {
	readonly idempotencyKey?: string | undefined;
	readonly signal?: AbortSignal | undefined;
}

export interface App {
	readonly queries: QueryStore;
	readonly reportFailure: FailureReport;
	send<R extends AnyRequest>(request: R, input: SentOf<R>, options?: SendOptions): Promise<CommandAnswer<OutputOf<R>>>;
	watch(request: AnyQuery, input: unknown, changed: () => void): () => void;
}

export const NOT_WATCHED = (): void => undefined;

export function refused(reason: string, ran: boolean): CommandAnswer<unknown> {
	return { ok: false, reason, ran };
}

export function issuesOf(name: string, side: "input" | "output", error: z.ZodError): string {
	const issues = error.issues.map(({ path, message }) => `${path.map(String).join(".") || "(root)"}: ${message}`);
	return `${name} ${side}: ${issues.join("; ")}`;
}

export function reasonOf(thrown: unknown): string {
	return thrown instanceof Error ? thrown.message : String(thrown);
}

export function parsedOutput(request: AnyRequest, returned: unknown): CommandAnswer<unknown> {
	const output = request.output.safeParse(returned);
	if (!output.success) return refused(issuesOf(request.name, "output", output.error), request.kind === "command");
	return { ok: true, output: output.data };
}
