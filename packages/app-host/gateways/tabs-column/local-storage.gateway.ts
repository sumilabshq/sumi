import { KeptColumnSchema } from "../../shared/schema/tabs-column.schema.js";
import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";
import { TabsColumnGateway } from "./tabs-column.gateway.js";

const KEY_OF_WORKSPACE = "widgetarium-studio-tabs-column:{workspace}";

export class LocalStorageTabsColumnGateway extends TabsColumnGateway {
	private readonly key: string;

	constructor(workspace: string) {
		super();
		this.key = KEY_OF_WORKSPACE.replace("{workspace}", workspace);
	}

	kept(): KeptColumn | null {
		const said = storageOrNull()?.getItem(this.key) ?? null;
		return said === null ? null : keptColumnOf(said);
	}

	keep(column: KeptColumn): void {
		try {
			storageOrNull()?.setItem(this.key, JSON.stringify(column));
		} catch (failure: unknown) {
			console.warn(`[widgetarium] ${this.key} could not be remembered`, failure);
		}
	}
}

function keptColumnOf(said: string): KeptColumn | null {
	try {
		const parsed = KeptColumnSchema.safeParse(JSON.parse(said));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

// TRADE-OFF: blocked site data throws on reading localStorage; Node hands a stub without methods
function storageOrNull(): Storage | null {
	try {
		const storage: Storage | undefined = globalThis.localStorage;
		return typeof storage?.getItem === "function" ? storage : null;
	} catch {
		return null;
	}
}
