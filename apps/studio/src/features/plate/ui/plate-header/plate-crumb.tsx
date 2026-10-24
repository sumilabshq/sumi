import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CrumbSaid } from "./crumb-said.js";
import { StillCrumb } from "./still-crumb.js";

export interface CrumbWords {
	readonly first: string;
	readonly second: string | null;
}

export interface PlateCrumbProps {
	readonly words: CrumbWords;
	readonly isPressable: boolean;
}

const CRUMB_LABEL = "Go to";

export function PlateCrumb({ words, isPressable }: PlateCrumbProps): ReactElement {
	if (!isPressable) {
		return <StillCrumb words={words} />;
	}

	return (
		<button type="button" className="wg-plate-crumb is-pressable" aria-label={`${CRUMB_LABEL} ${words.first}`}>
			<CrumbSaid words={words} />
		</button>
	);
}
