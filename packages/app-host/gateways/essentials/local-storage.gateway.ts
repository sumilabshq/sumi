import { KeptEssentialsSchema } from "../../shared/schema/essential.schema.js";
import type { KeptEssentials } from "../../shared/schema/essential.schema.js";
import { EssentialsGateway } from "./essentials.gateway.js";

const ESSENTIALS_KEY = "widgetarium-studio-essentials";

export class LocalStorageEssentialsGateway extends EssentialsGateway {
	kept(): KeptEssentials | null {
		const said = storageOrNull()?.getItem(ESSENTIALS_KEY) ?? null;
		return said === null ? null : keptEssentialsOf(said);
	}

	keep(essentials: KeptEssentials): void {
		try {
			storageOrNull()?.setItem(ESSENTIALS_KEY, JSON.stringify(essentials));
		} catch (failure: unknown) {
			console.warn(`[widgetarium] ${ESSENTIALS_KEY} could not be remembered`, failure);
		}
	}
}

function keptEssentialsOf(said: string): KeptEssentials | null {
	try {
		const parsed = KeptEssentialsSchema.safeParse(JSON.parse(said));
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
