export function statePropsOf<Props>(
	states: Readonly<Record<string, Props>>,
	state: string | null | undefined,
): Props | undefined {
	const [first] = Object.keys(states);
	return states[state ?? first ?? ""];
}
