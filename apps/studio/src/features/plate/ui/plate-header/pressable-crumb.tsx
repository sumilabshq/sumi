import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MENU_DOOR_MARK } from "../../../command-menu/lib/menu-door-mark.js";
import { useTogglesMenuOnShown } from "../../../command-menu/lib/use-toggles-menu-on-shown.js";
import { CrumbSaid } from "./crumb-said.js";
import type { CrumbWords } from "./plate-crumb.js";

const CRUMB_LABEL = "Go to";

export function PressableCrumb({ words }: { readonly words: CrumbWords }): ReactElement {
	const openMenuOnShown = useTogglesMenuOnShown(words.first);
	return (
		<button
			type="button"
			className="wg-plate-crumb is-pressable"
			aria-label={`${CRUMB_LABEL} ${words.first}`}
			data-plate-crumb=""
			{...MENU_DOOR_MARK}
			onClick={openMenuOnShown}
		>
			<CrumbSaid words={words} />
		</button>
	);
}
