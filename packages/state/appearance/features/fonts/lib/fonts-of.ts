import { DEFAULT_FAMILY_OF, FAMILIES_OF, choiceOf } from "../../../shared/lib/font-families.js";
import type { FontRole, Fonts, KeptFonts } from "../../../shared/schema/fonts.schema.js";

const ROLES: readonly FontRole[] = ["heading", "ui", "code"];

export function fontsOf(kept: KeptFonts): Fonts {
	const [heading, ui, code] = ROLES.map((role) => roleOf(role, kept[role]));
	return { heading: heading as Fonts["heading"], ui: ui as Fonts["ui"], code: code as Fonts["code"] };
}

function roleOf(role: FontRole, kept: string | null): Fonts[FontRole] {
	const family = kept ?? DEFAULT_FAMILY_OF[role];
	return {
		chosen: choiceOf(role, family),
		isDefault: kept === null,
		available: FAMILIES_OF[role].map((one) => choiceOf(role, one)),
	};
}
