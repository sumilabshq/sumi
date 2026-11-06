import type { AssistantCall, AssistantPhase, AssistantTurn } from "@widgetarium/core/engine/assistant-port.js";

export interface SpentSeen {
	readonly ms: number;
	readonly spent: number;
}

const A_MINUTE = 60000;
const A_THOUSAND = 1000;

const THINKING = "Thinking";
const WRITING = "Writing";

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_DAY = 86400;
const SECONDS = "{big}s";
const MINUTES = "{big}m {small}s";
const HOURS = "{big}h {small}m";
const DAYS = "{big}d {small}h";

export function saidElapsed(ms: number): string {
	const whole = Math.max(0, Math.floor(ms / 1000));

	if (ms < A_MINUTE) {
		return SECONDS.replace("{big}", String(whole));
	}

	if (whole < SECONDS_IN_HOUR) {
		return twoUnitsSaid(MINUTES, Math.floor(whole / SECONDS_IN_MINUTE), whole % SECONDS_IN_MINUTE);
	}

	if (whole < SECONDS_IN_DAY) {
		return twoUnitsSaid(HOURS, Math.floor(whole / SECONDS_IN_HOUR), Math.floor((whole % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE));
	}

	return twoUnitsSaid(DAYS, Math.floor(whole / SECONDS_IN_DAY), Math.floor((whole % SECONDS_IN_DAY) / SECONDS_IN_HOUR));
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

export function saidWaiting(phase: AssistantPhase | null): string {
	return phase === "writing" ? WRITING : THINKING;
}

// TRADE-OFF: parts joined, so no tokens leaves no gap
export function saidSpent({ ms, spent }: SpentSeen): string {
	return [saidElapsed(ms), saidTokens(spent)].filter(Boolean).join(" · ");
}

function twoUnitsSaid(pattern: string, big: number, small: number): string {
	return pattern.replace("{big}", String(big)).replace("{small}", String(small));
}
