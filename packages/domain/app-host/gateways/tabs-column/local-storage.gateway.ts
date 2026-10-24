import { KeptColumnSchema } from "../../shared/schema/tabs-column.schema.js";
import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";
import { TabsColumnGateway } from "./tabs-column.gateway.js";

const KEY_OF_WORKSPACE = "widgetarium-studio-tabs-column:{workspace}";

export class LocalStorageTabsColumnGateway extends TabsColumnGateway {
	private readonly key: string;
	private readonly listeners = new Set<() => void>();

	constructor(
		workspace: string,
		private readonly first: KeptColumn,
	) {
		super();
		this.key = KEY_OF_WORKSPACE.replace("{workspace}", () => workspace);
	}

	column(): KeptColumn {
		const said = storageOrNull()?.getItem(this.key) ?? null;
		return (said === null ? null : keptColumnOf(said)) ?? this.first;
	}

	saveColumn(column: KeptColumn): void {
		try {
			storageOrNull()?.setItem(this.key, JSON.stringify(column));
		} catch (failure: unknown) {
			console.warn(`[widgetarium] ${this.key} could not be remembered`, failure);
		}

		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	columnChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
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
