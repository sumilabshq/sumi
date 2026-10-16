export const tally = { failed: 0 };

export function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) tally.failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

export function thrownBy(run: () => unknown): string {
	try {
		run();
		return "";
	} catch (thrown) {
		return thrown instanceof Error ? thrown.message : String(thrown);
	}
}

export async function waitFor(isMet: () => boolean, ms = 2000): Promise<boolean> {
	const until = Date.now() + ms;
	while (Date.now() < until) {
		if (isMet()) return true;
		await new Promise((settled) => setTimeout(settled, 5));
	}
	return isMet();
}
