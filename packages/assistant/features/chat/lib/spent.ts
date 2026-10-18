import type { AssistantCall, AssistantPhase, AssistantTurn } from "@widgetarium/core/engine/assistant-port.js";

export interface PhaseSeen {
	readonly phase: AssistantPhase | null;
	readonly tool: string | null;
}

export interface ProgressSeen extends PhaseSeen {
	readonly ms: number;
	readonly spent: number;
}

const A_MINUTE = 60000;
const A_THOUSAND = 1000;

const PHASE_SAID: Readonly<Record<AssistantPhase, string>> = {
	thinking: "Thinking",
	tools: "Running tools",
	writing: "Writing",
};

const RUNNING = "Working";

const SECONDS = "{s} s";
const MINUTES = "{m} m {s} s";

export function saidElapsed(ms: number): string {
	const whole = Math.max(0, Math.floor(ms / 1000));
	if (ms < A_MINUTE) return SECONDS.replace("{s}", String(whole));
	return MINUTES.replace("{m}", String(Math.floor(whole / 60))).replace("{s}", String(whole % 60));
}

export function callsSpanMs(calls: readonly AssistantCall[]): number | null {
	const isTimed = calls.every((call) => call.answered && call.at > 0 && (call.answeredAt ?? 0) >= call.at);
	if (calls.length === 0 || !isTimed) {
		return null;
	}

	const started = Math.min(...calls.map((call) => call.at));
	return Math.max(...calls.map((call) => call.answeredAt ?? call.at)) - started;
}

export function turnSpanMs({ startedAt, endedAt }: AssistantTurn): number | null {
	return startedAt !== undefined && endedAt !== undefined && endedAt >= startedAt ? endedAt - startedAt : null;
}

export function saidTokens(spent: number): string {
	if (!Number.isFinite(spent) || spent <= 0) return "";
	if (spent < A_THOUSAND) return `${spent} tokens`;
	return `${(spent / A_THOUSAND).toFixed(1)}k tokens`;
}

export function saidPhase({ phase, tool }: PhaseSeen): string {
	if (phase === "tools" && tool) return `Running ${tool}`;
	return (phase ? PHASE_SAID[phase] : undefined) ?? RUNNING;
}

// TRADE-OFF: the parts are joined with a separator rather than authored as one sentence, because a provider that reports no tokens must drop that part without leaving a gap behind it
export function saidProgress({ ms, spent, phase, tool }: ProgressSeen): string {
	return [saidElapsed(ms), saidTokens(spent), saidPhase({ phase, tool })].filter(Boolean).join(" · ");
}
