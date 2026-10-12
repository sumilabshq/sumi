import { useContext, useMemo, useRef } from "react";
import { useCommandHandle } from "../command-handle";
import { REFUSAL_HANDLER } from "../command-refusals";
import type { RefusalHandler } from "../command-refusals";
import type { Action } from "../gateway/contract";
import type { CommandAnswer } from "../gateway/run-handler";
import { stableKey } from "../gateway/stable-key";
import type { CommandHandle } from "../handle-types";
import { useApp } from "./app-context";
import type { AnyCommand, OutputOf, SentOf } from "./request";
import type { App } from "./sends";

interface CommandRunNeeds {
	readonly sender: App;
	readonly request: AnyCommand;
	readonly onRefused: RefusalHandler;
	readonly callKeys: Map<string, string>;
}

const ALWAYS = { can: true } as const;

export function useCommand<R extends AnyCommand>(request: R): CommandHandle<SentOf<R>, OutputOf<R>>;
export function useCommand(request: AnyCommand): unknown {
	const sender = useApp("useCommand");
	const onRefused = useContext(REFUSAL_HANDLER);
	const callKeys = useRef(new Map<string, string>()).current;
	const run = useMemo(
		() => commandRunOf({ sender, request, onRefused, callKeys }),
		[sender, request, onRefused, callKeys],
	);
	return useCommandHandle(request.name, run);
}

function commandRunOf({
	sender,
	request,
	onRefused,
	callKeys,
}: CommandRunNeeds): Action<unknown, CommandAnswer<unknown>> {
	const run = async (input: unknown): Promise<CommandAnswer<unknown>> => {
		const call = stableKey(input);
		const idempotencyKey = request.idempotencyKey === "per-call" ? callKeyOf(callKeys, call) : undefined;
		const answer = await sender.send(request, input, { idempotencyKey });
		if (answer.ok || answer.ran) callKeys.delete(call);
		if (!answer.ok) onRefused({ name: request.name, reason: answer.reason, ran: answer.ran });
		return answer;
	};
	return Object.assign(run, { can: () => ALWAYS });
}

function callKeyOf(callKeys: Map<string, string>, call: string): string {
	const known = callKeys.get(call);
	if (known !== undefined) return known;
	const made = crypto.randomUUID();
	callKeys.set(call, made);
	return made;
}
