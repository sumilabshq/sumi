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

export function isNestableSource(source: DragSource): boolean {
	return source.kind === "essential" || (source.kind === "tab" && source.isNestable);
}
