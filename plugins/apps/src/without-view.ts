import type { AppFace } from "@sumi/apps";
import type { AppView } from "./slots.js";

export function withoutView({ id, title, icon }: AppFace & { readonly view: AppView }): AppFace {
	return { id, title, icon };
}
