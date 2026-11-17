import type { Answer } from "./answer";

const REFUSED_LINE = "[request] {name} → refused ({code}) in {ms}ms: {reason}";
const ANSWERED_LINE = "[request] {name} → ok in {ms}ms";

let isRequestTracingOn = false;

export function setRequestTracing(isOn: boolean): void {
	isRequestTracingOn = isOn;
}

export function traceRequest(name: string, sent: unknown, answer: Answer<unknown>, startedMs: number): void {
	const ms = String(Math.round(performance.now() - startedMs));

	if (!answer.ok) {
		// TRADE-OFF: beside reportFailure's error line; threading input through every refuse() is wider than this change
		console.warn(
			REFUSED_LINE.replace("{name}", name)
				.replace("{code}", answer.code)
				.replace("{ms}", ms)
				.replace("{reason}", answer.reason),
			{ input: sent },
		);
		return;
	}

	if (isRequestTracingOn) {
		console.debug(ANSWERED_LINE.replace("{name}", name).replace("{ms}", ms), { input: sent });
	}
}
