import { useContext, useMemo } from "react";
import { useCommandHandle } from "../command-handle";
import { REFUSAL_HANDLER } from "../command-refusals";
import type { RefusalHandler } from "../command-refusals";
import type { Action } from "../gateway/contract";
import type { CommandAnswer } from "../gateway/run-handler";
import type { CommandHandle } from "../handle-types";
import { useApp } from "./app-context";
import type { AnyCommand, OutputOf, SentOf } from "./request";
import type { App } from "./sends";

const ALWAYS = { can: true } as const;

export function useCommand<R extends AnyCommand>(request: R): CommandHandle<SentOf<R>, OutputOf<R>>;
export function useCommand(request: AnyCommand): unknown {
	const sender = useApp("useCommand");
	const onRefused = useContext(REFUSAL_HANDLER);
	const run = useMemo(() => commandRunOf(sender, request, onRefused), [sender, request, onRefused]);
	return useCommandHandle(request.name, run);
}

function commandRunOf(
	sender: App,
	request: AnyCommand,
	onRefused: RefusalHandler,
): Action<unknown, CommandAnswer<unknown>> {
	const run = async (input: unknown): Promise<CommandAnswer<unknown>> => {
		const idempotencyKey = request.idempotencyKey === "per-call" ? crypto.randomUUID() : undefined;
		const answer = await sender.send(request, input, { idempotencyKey });
		if (!answer.ok) onRefused({ name: request.name, reason: answer.reason, ran: answer.ran });
		return answer;
	};
	return Object.assign(run, { can: () => ALWAYS });
}
