import type { SystemScheme } from "../../shared/host/system-scheme.host.js";
import type { Scheme, ThemeChoice } from "../../shared/schema/theme.schema.js";
import { memoryKept } from "../kept/kept.gateway.js";
import type { Kept } from "../kept/kept.gateway.js";
import { ThemeGateway } from "./theme.gateway.js";

export const SYSTEM_CHOICE: ThemeChoice = "system";

export class MediaThemeGateway extends ThemeGateway {
	constructor(
		private readonly system: SystemScheme,
		private readonly kept: Kept<ThemeChoice> = memoryKept(SYSTEM_CHOICE),
	) {
		super();
	}

	override systemScheme(): Scheme {
		return this.system.matches ? "dark" : "light";
	}

	override choice(): ThemeChoice {
		return this.kept.now();
	}

	override saveChoice(choice: ThemeChoice, reason: string): void {
		this.kept.change(choice, reason);
	}

	override themeChanged(listener: () => void): () => void {
		const systemSchemeChanged = (): void => listener();
		const stopWatching = this.kept.watch(listener);
		this.system.addEventListener("change", systemSchemeChanged);
		return () => {
			stopWatching();
			this.system.removeEventListener("change", systemSchemeChanged);
		};
	}
}
