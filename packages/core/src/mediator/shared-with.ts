export function sharedWith(before: unknown, after: unknown): unknown {
	if (Object.is(before, after)) return before;
	if (Array.isArray(before) && Array.isArray(after)) return sharedArrayOf(before, after);
	if (isPlainRecord(before) && isPlainRecord(after)) return sharedRecordOf(before, after);
	return after;
}

function sharedArrayOf(before: readonly unknown[], after: readonly unknown[]): readonly unknown[] {
	const items = after.map((item, at) => sharedWith(before[at], item));
	const isSame = items.length === before.length && items.every((item, at) => item === before[at]);
	return isSame ? before : items;
}

function sharedRecordOf(
	before: Readonly<Record<string, unknown>>,
	after: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
	const keys = Object.keys(after);
	const fields = Object.fromEntries(keys.map((key) => [key, sharedWith(before[key], after[key])]));
	const isSame =
		keys.length === Object.keys(before).length && keys.every((key) => key in before && fields[key] === before[key]);
	return isSame ? before : fields;
}

function isPlainRecord(held: unknown): held is Readonly<Record<string, unknown>> {
	if (typeof held !== "object" || held === null) return false;
	const prototype: unknown = Object.getPrototypeOf(held);
	return prototype === Object.prototype || prototype === null;
}
