import type { AppFace } from "../schema/app.schema.js";

export interface AppsConfig {
	readonly apps: readonly AppFace[];
	readonly titlesOf?: ReadonlyMap<string, (address: string) => string>;
}
