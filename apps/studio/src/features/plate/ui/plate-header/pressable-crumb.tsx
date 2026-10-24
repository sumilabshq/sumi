import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOpensMenuOnShown } from "../../../command-menu/lib/use-opens-menu-on-shown.js";
import { CrumbSaid } from "./crumb-said.js";
import type { CrumbWords } from "./plate-crumb.js";

const CRUMB_LABEL = "Go to";

export function PressableCrumb({ words }: { readonly words: CrumbWords }): ReactElement {
	const openMenuOnShown = useOpensMenuOnShown(words.first);
	return (
		<button
			type="button"
			className="wg-plate-crumb is-pressable"
			aria-label={`${CRUMB_LABEL} ${words.first}`}
			data-plate-crumb=""
			onClick={openMenuOnShown}
		>
			<CrumbSaid words={words} />
		</button>
	);
}
