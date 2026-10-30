import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

const PINNED = "Pinned";
const PIN_PX = 12;
const PIN = "cv:ms-auto cv:flex cv:flex-none cv:text-(--sumi-text-3)";

export function PinnedMark(): ReactElement {
	return (
		<span className={PIN} role="img" aria-label={PINNED} data-split-pinned="">
			<Icon name="pin" size={PIN_PX} />
		</span>
	);
}
