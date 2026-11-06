import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import type { Chat, ShownTurn, TurnStep } from "@widgetarium/assistant";

export type ToolsStep = Extract<TurnStep, { readonly kind: "tools" }>;

export interface LiveTools {
	readonly isShown: boolean;
	readonly hasGroup: boolean;
	readonly groupKey: string;
	readonly calls: readonly AssistantCall[];
	readonly faces: readonly CallFace[];
	readonly isLastTurnEmptied: boolean;
}

const WAITING_KEY = "waiting";

const NOT_LIVE: LiveTools = {
	isShown: false,
	hasGroup: false,
	groupKey: WAITING_KEY,
	calls: [],
	faces: [],
	isLastTurnEmptied: false,
};

export function liveToolsOf({ session, turns }: Chat): LiveTools {
	const last = turns.at(-1);

	if (!session.busy || !last || last.turn.role === "compact") {
		return NOT_LIVE;
	}

	const step = last.steps.at(-1);
	const tools = step?.kind === "tools" ? step : null;
	return {
		...NOT_LIVE,
		...groupOf(tools),
		isShown: true,
		isLastTurnEmptied: isEmptiedBy(last, tools),
	};
}

function groupOf(tools: ToolsStep | null): Partial<LiveTools> {
	if (tools === null) {
		return {};
	}

	return {
		hasGroup: true,
		groupKey: tools.calls[0]?.ref ?? WAITING_KEY,
		calls: tools.calls,
		faces: tools.faces,
	};
}

function isEmptiedBy(last: ShownTurn, tools: ToolsStep | null): boolean {
	const drawnSteps = last.steps.filter((held) => held !== tools && !isBlankSaid(held));
	return last.turn.role === "agent" && drawnSteps.length === 0 && last.attached.length === 0;
}

function isBlankSaid(step: TurnStep): boolean {
	return step.kind === "said" && step.text.trim() === "";
}
