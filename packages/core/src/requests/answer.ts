import { z } from "zod";
import { Refused } from "./refused";

export const REFUSAL_CODES = [
	"invalid-input",
	"invalid-output",
	"unauthenticated",
	"forbidden",
	"refused-by-guard",
	"refused",
	"rate-limited",
	"missing-key",
	"no-server",
	"not-found",
	"unreachable",
	"failed",
] as const;

const RefusalSchema = z.object({
	ok: z.literal(false),
	reason: z.string(),
	code: z.enum(REFUSAL_CODES),
	ran: z.boolean(),
});

export const AnswerSchema = z.union([z.object({ ok: z.literal(true), output: z.unknown() }), RefusalSchema]);

export type RefusalCode = (typeof REFUSAL_CODES)[number];

export type Refusal = Readonly<z.output<typeof RefusalSchema>>;

export type Answer<Output> = { readonly ok: true; readonly output: Output } | Refusal;

export function refusalOf(code: RefusalCode, reason: string, ran = false): Refusal {
	return { ok: false, reason, code, ran };
}

export function refusalOfThrown(thrown: unknown, ran: boolean): Refusal {
	if (thrown instanceof Refused) return refusalOf("refused", thrown.message);
	return refusalOf("failed", reasonOf(thrown), ran);
}

export function issuesOf(name: string, side: "input" | "output", error: z.ZodError): string {
	const issues = error.issues.map(({ path, message }) => `${path.map(String).join(".") || "(root)"}: ${message}`);
	return `${name} ${side}: ${issues.join("; ")}`;
}

export function reasonOf(thrown: unknown): string {
	return thrown instanceof Error ? thrown.message : String(thrown);
}
