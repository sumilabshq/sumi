import type { z } from "zod";

export type Parsed<T> =
	{ readonly value: T; readonly refusal?: undefined } | { readonly value?: undefined; readonly refusal: string };

export function jsonOf(text: string, label: string): Parsed<unknown> {
	try {
		return { value: JSON.parse(text) };
	} catch (failure) {
		return { refusal: `${label} is not JSON: ${failure instanceof Error ? failure.message : String(failure)}` };
	}
}

export function issueSaidOf(error: z.ZodError, label: string): string {
	const [issue] = error.issues;
	return `${issue?.path.join(".") || label}: ${issue?.message ?? "does not fit"}`;
}
