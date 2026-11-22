import { LUCIDE_NAME_OF } from "./glyphs";
import { ICON_TABLE, ICON_WORDS } from "./icon-table";

export interface OfferedIcon {
	readonly name: string;
	readonly words: string;
}

const SPOKEN_ICONS: Readonly<Record<string, string>> = ICON_WORDS;

let everyIconOffered: readonly OfferedIcon[] | null = null;

export function offeredIcons(): readonly OfferedIcon[] {
	const kitNames = Object.keys(LUCIDE_NAME_OF);
	everyIconOffered ??= kitNames
		.concat(Object.keys(ICON_TABLE).filter((name) => !kitNames.includes(name)))
		.map(offeredIcon);
	return everyIconOffered;
}

function offeredIcon(name: string): OfferedIcon {
	return { name, words: (Object.hasOwn(SPOKEN_ICONS, name) ? SPOKEN_ICONS[name] : undefined) ?? "" };
}
