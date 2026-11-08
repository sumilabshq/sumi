export function withToggled(values: ReadonlySet<string>, value: string): ReadonlySet<string> {
	const next = new Set(values);

	if (next.has(value)) {
		next.delete(value);
		return next;
	}

	next.add(value);
	return next;
}
