import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import type { TurnStep } from "../../../shared/schema/chat.schema.js";

export interface CallWithFace {
	readonly call: AssistantCall;
	readonly face: CallFace;
}

export function turnStepsOf(text: string, callsWithFaces: readonly CallWithFace[]): TurnStep[] {
	const steps: TurnStep[] = [];
	let cursor = 0;

	for (const { call, face } of callsWithFaces) {
		const offset = Math.min(Math.max(call.textOffset ?? 0, cursor), text.length);
		pushSaidStep(steps, text.slice(cursor, offset));
		pushToolsStep(steps, call, face);
		cursor = offset;
	}

	pushSaidStep(steps, text.slice(cursor));
	return steps;
}

function pushSaidStep(steps: TurnStep[], said: string): void {
	if (said.trim() === "") {
		return;
	}

	steps.push({
		kind: "said",
		text: said,
	});
}

function pushToolsStep(steps: TurnStep[], call: AssistantCall, face: CallFace): void {
	const last = steps.at(-1);

	if (last?.kind === "tools") {
		last.calls.push(call);
		last.faces.push(face);
		return;
	}

	steps.push({
		kind: "tools",
		calls: [call],
		faces: [face],
	});
}
