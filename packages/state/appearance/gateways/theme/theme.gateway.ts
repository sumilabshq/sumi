import type { Scheme, ThemeChoice } from "../../shared/schema/theme.schema.js";

export abstract class ThemeGateway {
	abstract systemScheme(): Scheme;
	abstract choice(): ThemeChoice;
	abstract saveChoice(choice: ThemeChoice, reason: string): void;
	abstract themeChanged(listener: () => void): () => void;
}
