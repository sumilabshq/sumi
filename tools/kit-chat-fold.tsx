import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { SCROLL_KEEP_ATTRIBUTE } from "../packages/shared/kit/src/index";

const OPEN_FOLD_PX = 600;
const SHUT_FOLD_PX = 60;
const KEPT_IN_PLACE = { [SCROLL_KEEP_ATTRIBUTE]: "" };

export function Fold({ id }: { readonly id: string }): ReactElement {
	const [isOpen, setOpen] = useState(true);
	return (
		<div {...KEPT_IN_PLACE}>
			<div style={{ height: isOpen ? OPEN_FOLD_PX : SHUT_FOLD_PX }}>{id}</div>
			<button
				type="button"
				data-fold={id}
				{...(isOpen ? KEPT_IN_PLACE : {})}
				onClick={() => flushSync(() => setOpen(!isOpen))}
			>
				fold
			</button>
		</div>
	);
}
