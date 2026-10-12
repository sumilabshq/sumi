import { token } from "./token";

export interface Failure {
	readonly source: string;
	readonly reason: string;
	readonly ran: boolean;
	readonly thrown: unknown;
}

export type ReportFailure = (failure: Failure) => void;

export const ReportFailure = token<ReportFailure>("ReportFailure");

export function reportToConsole({ source, reason, ran, thrown }: Failure): void {
	console.error(`[widgetarium] ${source} failed: ${reason}`, { ran, thrown });
}
