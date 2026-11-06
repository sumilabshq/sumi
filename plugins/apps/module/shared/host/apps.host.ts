import type { AppFace } from "../schema/app.schema.js";

export interface AppsConfig {
	readonly apps: readonly AppFace[];
}
