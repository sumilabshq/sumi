import type { AppFace } from "../../shared/schema/app.schema.js";

export abstract class AppListGateway {
	abstract apps(): readonly AppFace[];
}
