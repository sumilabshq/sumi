export interface JoinedWindow {
	readonly workspace: string;
	readonly label: string;
	readonly openedAt: number;
}

export interface LeftBehind extends JoinedWindow {
	readonly latest: string;
}

export function windowsLeftBehind(joined: readonly JoinedWindow[]): readonly LeftBehind[] {
	const latest = new Map<string, JoinedWindow>();

	for (const one of joined) {
		const known = latest.get(one.label);

		if (known === undefined || known.openedAt < one.openedAt) {
			latest.set(one.label, one);
		}
	}

	return joined.flatMap((one) => {
		const newest = latest.get(one.label);
		return newest === undefined || newest.workspace === one.workspace ? [] : [{ ...one, latest: newest.workspace }];
	});
}
