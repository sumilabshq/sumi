import { z } from "zod";
import { CliRefusal } from "./cli-output.js";

export function parsedArgs<T>(parse: () => T): T {
	try {
		return parse();
	} catch (error) {
		throw new CliRefusal(error instanceof Error ? error.message : String(error));
	}
}

export function refuseExtraPositionals(positionals: readonly string[], allowed: number): void {
	if (positionals.length <= allowed) {
		return;
	}

	throw new CliRefusal(`unexpected arguments: ${positionals.slice(allowed).join(" ")}`);
}

export function parsedWith<T>(schema: z.ZodType<T>, input: unknown): T {
	const parsed = schema.safeParse(input);

	if (parsed.success) {
		return parsed.data;
	}

	throw new CliRefusal(parsed.error.issues.map(({ message }) => message).join("; "));
}
