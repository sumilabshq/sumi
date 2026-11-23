import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";

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
			<Button
				shape="square"
				emphasis="ghost"
				size="2xs"
				className="wg-cm-token-drop"
				label={SEARCH_EVERYTHING}
				onMouseDown={(event) => event.preventDefault()}
				onClick={onDrop}
			>
				<Icon name="x" size={DROP_ICON_PX} />
			</Button>
		</span>
	);
}
