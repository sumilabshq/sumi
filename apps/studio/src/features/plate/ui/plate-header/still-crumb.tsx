import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CrumbSaid } from "./crumb-said.js";
import type { CrumbWords } from "./plate-crumb.js";

export function StillCrumb({ words }: { readonly words: CrumbWords }): ReactElement {
	return (
		<span className="wg-plate-crumb">
			<CrumbSaid words={words} />
		</span>
	);
}
