import { createElement as h } from "react";
import type { ReactElement } from "react";
import { OPENS_LAYER_MARK } from "@sumi/sumi-host-plugin";
import { useTogglesMenuOnShown } from "../../lib/use-toggles-menu-on-shown.js";
import { CrumbSaid } from "./crumb-said.js";
import type { CrumbWords } from "./plate-crumb.js";

const CRUMB_LABEL = "Go to";

export interface PressableCrumbProps {
	readonly words: CrumbWords;
	readonly pageId: string | null;
}

export function PressableCrumb({ words, pageId }: PressableCrumbProps): ReactElement {
	const openMenuOnShown = useTogglesMenuOnShown(words.first, pageId);
	return (
		<button
			type="button"
			className="wg-plate-crumb is-pressable"
			aria-label={`${CRUMB_LABEL} ${words.first}`}
			data-plate-crumb=""
			{...OPENS_LAYER_MARK}
			onClick={openMenuOnShown}
		>
			<CrumbSaid words={words} />
		</button>
	);
}
