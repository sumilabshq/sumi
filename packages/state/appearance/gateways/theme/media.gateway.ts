import type { SystemScheme } from "../../shared/host/system-scheme.host.js";
import type { Scheme, ThemeChoice } from "../../shared/schema/theme.schema.js";
import { ThemeGateway } from "./theme.gateway.js";

const SYSTEM_CHOICE: ThemeChoice = "system";

// TODO: keep the choice in the workspace settings file; it lives as long as the window
export class MediaThemeGateway extends ThemeGateway {
	private held: ThemeChoice = SYSTEM_CHOICE;
	private readonly listeners = new Set<() => void>();

	constructor(private readonly system: SystemScheme) {
		super();
	}

	override systemScheme(): Scheme {
		return this.system.matches ? "dark" : "light";
	}

	override choice(): ThemeChoice {
		return this.held;
	}

	override saveChoice(choice: ThemeChoice): void {
		this.held = choice;
		this.listeners.forEach((listener) => listener());
	}

	override themeChanged(listener: () => void): () => void {
		const systemSchemeChanged = (): void => listener();
		this.listeners.add(listener);
		this.system.addEventListener("change", systemSchemeChanged);
		return () => {
			this.listeners.delete(listener);
			this.system.removeEventListener("change", systemSchemeChanged);
		};
	}
}
