import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface ThisTabTokenProps {
	readonly onDrop: () => void;
}

const IN_THIS_TAB = "In this tab";
const SEARCH_EVERYTHING = "Remove, search everything";
const DROP_ICON_PX = 12;

export function ThisTabToken({ onDrop }: ThisTabTokenProps): ReactElement {
	return (
		<span className="wg-cm-token">
			{IN_THIS_TAB}
			<button
				type="button"
				className="wg-cm-token-drop"
				aria-label={SEARCH_EVERYTHING}
				onMouseDown={(event) => event.preventDefault()}
				onClick={onDrop}
			>
				<Icon name="x" size={DROP_ICON_PX} />
			</button>
		</span>
	);
}
