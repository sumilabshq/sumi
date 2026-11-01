import type { Scheme, ThemeChoice } from "../../../shared/schema/theme.schema.js";

export function schemeOf(choice: ThemeChoice, system: Scheme): Scheme {
	return choice === "system" ? system : choice;
}
