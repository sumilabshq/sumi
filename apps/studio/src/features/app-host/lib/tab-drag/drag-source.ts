import type { Rename } from "./tab-drops.js";
import type { TabRef } from "./tab-ref.js";

export type DragSource =
	| (TabRef & { readonly kind: "tab" })
	| {
			readonly kind: "essential";
			readonly id: string;
			readonly at: number;
	  }
	| {
			readonly kind: "group";
			readonly id: string;
			readonly list: string;
	  };

export function renameSource(source: DragSource, { was, now }: Rename): DragSource {
	return source.id === was ? { ...source, id: now } : source;
}

export function isNestableSource(source: DragSource): boolean {
	return source.kind === "essential" || (source.kind === "tab" && source.isNestable);
}
