const REFUSED = "{subject} refused:\n{findings}";

export function throwIfRefused(subject: string, findings: readonly string[]): void {
	if (findings.length === 0) {
		return;
	}

	throw new Error(REFUSED.replace("{subject}", subject).replace("{findings}", findings.join("\n")));
}
