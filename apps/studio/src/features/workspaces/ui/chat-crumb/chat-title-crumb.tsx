import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CrumbSaid } from "../../../plate/ui/plate-header/crumb-said.js";
import type { CrumbWords } from "../../../plate/ui/plate-header/plate-crumb.js";

export function ChatTitleCrumb({ words }: { readonly words: CrumbWords }): ReactElement {
	return (
		<span className="wg-plate-crumb" data-plate-crumb="" data-ws-crumb="">
			<CrumbSaid words={words} />
		</span>
	);
}
