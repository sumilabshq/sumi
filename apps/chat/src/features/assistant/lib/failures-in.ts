export function failuresIn(calls: readonly { readonly failed: boolean }[]): number {
	return calls.filter((call) => call.failed).length;
}
