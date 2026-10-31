export function reportFrameProblem(app: string, reason: string): void {
	console.error(`[widgetarium] app ${app}: ${reason}`);
}
