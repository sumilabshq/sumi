const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

// TODO: move to @sumi/contract
export function isNewerVersion(candidate: string, current: string | null): boolean {
	if (current === null) {
		return true;
	}

	const one = partsOf(candidate);
	const other = partsOf(current);
	return one !== null && other !== null && isAhead(one, other);
}

function isAhead(one: readonly number[], other: readonly number[]): boolean {
	const differs = one.findIndex((part, at) => part !== other[at]);
	return differs !== -1 && (one[differs] ?? 0) > (other[differs] ?? 0);
}

function partsOf(version: string): readonly number[] | null {
	const match = VERSION.exec(version);
	return match === null ? null : match.slice(1).map(Number);
}
