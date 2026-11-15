export const SIDEBAR_MEASURE_PREFIX = "sumi-sidebar:";

export function measureSince(name: string, startedAt: number): void {
	const measure = `${SIDEBAR_MEASURE_PREFIX}${name}`;

	try {
		performance.measure(measure, {
			start: startedAt,
			end: performance.now(),
		});
		performance.clearMeasures(measure);
	} catch (failure: unknown) {
		console.warn(`[widgetarium] sidebar timing ${name} not measured`, failure);
	}
}
