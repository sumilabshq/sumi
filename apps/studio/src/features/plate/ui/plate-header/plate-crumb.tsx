import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PressableCrumb } from "./pressable-crumb.js";
import { StillCrumb } from "./still-crumb.js";

export interface CrumbWords {
	readonly first: string;
	readonly second: string | null;
}

export interface PlateCrumbProps {
	readonly words: CrumbWords;
	readonly isPressable: boolean;
	readonly pageId?: string | null;
}

export function PlateCrumb({ words, isPressable, pageId = null }: PlateCrumbProps): ReactElement {
	if (!isPressable) {
		return <StillCrumb words={words} />;
	}

	return <PressableCrumb words={words} pageId={pageId} />;
}
