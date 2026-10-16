import type { DataAdapter } from "obsidian";

type TextAt =
	| { readonly kind: "read"; readonly text: string }
	| { readonly kind: "absent" }
	| { readonly kind: "refused"; readonly refusal: string };

export type ReadingAdapter = Pick<DataAdapter, "read" | "exists">;

const NOT_READ = "{path} could not be read: {why}";

export async function textAt(adapter: ReadingAdapter, path: string): Promise<TextAt> {
	try {
		return { kind: "read", text: await adapter.read(path) };
	} catch (failure) {
		if (!(await adapter.exists(path).catch(() => true))) return { kind: "absent" };
		const why = failure instanceof Error ? failure.message : String(failure);
		return { kind: "refused", refusal: NOT_READ.replace("{path}", path).replace("{why}", why) };
	}
}

export function textOrRefused(read: TextAt): string | null {
	if (read.kind === "refused") throw new Error(read.refusal);
	return read.kind === "read" ? read.text : null;
}
