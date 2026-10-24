import type { Refusal, RefusalCode } from "./answer";

export interface Failure {
	readonly source: string;
	readonly reason: string;
	readonly code: RefusalCode;
	readonly ran: boolean;
	readonly thrown: unknown;
}

export type FailureReport = (failure: Failure) => void;

export function reportToConsole({ source, reason, code, ran, thrown }: Failure): void {
	console.error(`[widgetarium] ${source} refused (${code}): ${reason}`, { ran, thrown });
}

export function reportRefusal(report: FailureReport, source: string, refusal: Refusal, thrown: unknown): Refusal {
	report({ source, reason: refusal.reason, code: refusal.code, ran: refusal.ran, thrown });
	return refusal;
}
