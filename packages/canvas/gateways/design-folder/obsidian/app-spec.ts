import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import type { SpecRead } from "@widgetarium/core/app-spec.js";
import { textAt } from "../../../shared/lib/files/text-at.js";
import type { ReadingAdapter } from "../../../shared/lib/files/text-at.js";

export async function readAppSpec(adapter: ReadingAdapter, app: string): Promise<SpecRead | null> {
	const held = await textAt(adapter, specPathOf(app));
	if (held.kind === "refused") {
		return { refusal: held.refusal };
	}

	return held.kind === "read" ? readSpec(held.text) : null;
}
