import { useContext, useMemo, useRef } from "react";
import { useCommandHandle } from "./command-handle";
import { REFUSAL_HANDLER } from "./command-refusals";
import type { RefusalHandler } from "./command-refusals";
import type { Action, CanResult } from "./gateway/contract";
import type { CommandAnswer } from "./gateway/run-handler";
import { stableKey } from "./gateway/stable-key";
import type { CommandHandle } from "./handle-types";
import { useRuntime } from "./runtime-context";
import type { Runtime } from "./runtime";
import type { AnyCommand, OutputOf, SentOf } from "./request";

interface CommandRunNeeds {
	readonly started: Runtime;
	readonly request: AnyCommand;
	readonly onRefused: RefusalHandler;
	readonly callKeys: Map<string, string>;
}

export function useCommand<R extends AnyCommand>(request: R): CommandHandle<SentOf<R>, OutputOf<R>>;
export function useCommand(request: AnyCommand): CommandHandle<unknown, unknown> {
	const started = useRuntime("useCommand");
	const onRefused = useContext(REFUSAL_HANDLER);
	const callKeys = useRef(new Map<string, string>()).current;
	const run = useMemo(
		() => commandRunOf({ started, request, onRefused, callKeys }),
		[started, request, onRefused, callKeys],
	);
	return useCommandHandle(request.name, run);
}

function commandRunOf(needs: CommandRunNeeds): Action<unknown, CommandAnswer<unknown>> {
	const run = (input: unknown): Promise<CommandAnswer<unknown>> => answerOf(needs, input);
	return Object.assign(run, { can: (): CanResult => canRun(needs.started, needs.request) });
}

async function answerOf(
	{ started, request, onRefused, callKeys }: CommandRunNeeds,
	input: unknown,
): Promise<CommandAnswer<unknown>> {
	const call = stableKey(input);
	const answer = await started.send(request, input, { idempotencyKey: callKeyOf(callKeys, call) });
	if (answer.ok || answer.ran) callKeys.delete(call);
	if (!answer.ok) onRefused({ name: request.name, reason: answer.reason, ran: answer.ran });
	return answer;
}

function canRun(started: Runtime, request: AnyCommand): CanResult {
	const reason = started.routes.cannotRun(request);
	return reason === null ? { can: true } : { can: false, reason };
}

function callKeyOf(callKeys: Map<string, string>, call: string): string {
	const known = callKeys.get(call);
	if (known !== undefined) return known;
	const made = crypto.randomUUID();
	callKeys.set(call, made);
	return made;
}
