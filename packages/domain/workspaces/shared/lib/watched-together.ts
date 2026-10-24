export function watchedTogether(stops: readonly (() => void)[]): () => void {
	return () => {
		for (const stop of stops) {
			stop();
		}
	};
}
