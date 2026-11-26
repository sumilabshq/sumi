import { createElement as h } from "react";
import type { ReactElement } from "react";
import { StillCrumb } from "./still-crumb.js";

export interface CrumbWords {
	readonly first: string;
	readonly second: string | null;
}

export function PlateCrumb({ words }: { readonly words: CrumbWords }): ReactElement {
	return <StillCrumb words={words} />;
}
