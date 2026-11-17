export interface Answer {
	readonly ok: boolean;
	readonly reason?: string;
}

export function warnIfRefused(asked: string): (answer: Answer) => void {
	return (answer) => {
		if (!answer.ok) {
			console.warn(`[widgetarium] ${asked} refused: ${answer.reason ?? "no reason given"}`);
		}
	};
}
