import type { AppFace } from "../../shared/schema/app.schema.js";
import { AppListGateway } from "./app-list.gateway.js";

export class ListedAppListGateway extends AppListGateway {
	constructor(private readonly listed: readonly AppFace[]) {
		super();
	}

	apps(): readonly AppFace[] {
		return this.listed;
	}
}
