import type { Chat, TurnStep } from "@widgetarium/assistant";

export type ToolsStep = Extract<TurnStep, { readonly kind: "tools" }>;

export interface LiveTools {
	readonly isShown: boolean;
	readonly step: ToolsStep | null;
	readonly isLastTurnEmptied: boolean;
}

export function liveToolsOf({ session, turns }: Chat): LiveTools {
	const last = turns.at(-1);

	if (!session.busy || !last || last.turn.role === "compact") {
		return {
			isShown: false,
			step: null,
			isLastTurnEmptied: false,
		};
	}

	const step = last.steps.at(-1);
	const tools = step?.kind === "tools" ? step : null;
	const drawnSteps = last.steps.filter((held) => held !== tools && !isBlankSaid(held));
	return {
		isShown: true,
		step: tools,
		isLastTurnEmptied: last.turn.role === "agent" && drawnSteps.length === 0 && last.attached.length === 0,
	};
}

function isBlankSaid(step: TurnStep): boolean {
	return step.kind === "said" && step.text.trim() === "";
}
