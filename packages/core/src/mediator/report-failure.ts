export interface Failure {
	readonly source: string;
	readonly reason: string;
	readonly ran: boolean;
	readonly thrown: unknown;
}

export type FailureReport = (failure: Failure) => void;

export abstract class ReportFailure {
	abstract report(failure: Failure): void;
}

export function reportToConsole({ source, reason, ran, thrown }: Failure): void {
	console.error(`[widgetarium] ${source} failed: ${reason}`, { ran, thrown });
}
