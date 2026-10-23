import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { CrumbWords } from "./plate-crumb.js";

export function CrumbSaid({ words }: { readonly words: CrumbWords }): ReactElement {
	return (
		<Fragment>
			<span className="wg-plate-crumb-first">{words.first}</span>
			{words.second === null ? null : <span className="wg-plate-crumb-slash">/</span>}
			{words.second === null ? null : <span className="wg-plate-crumb-second">{words.second}</span>}
		</Fragment>
	);
}
