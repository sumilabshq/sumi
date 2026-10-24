import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";

const FOOT: ReadonlyArray<readonly [string, string]> = [
	["zap", "Routines"],
	["settings", "Settings"],
];
const ROW_ICON_PX = 16;

export function ColumnFoot(): ReactElement {
	return (
		<div className="wg-ws-foot" data-ws-foot="">
			{FOOT.map(([icon, said]) => (
				<Button key={said} variant="ghost" className="wg-ws-line-row" aria-disabled="true" data-ws-inert="">
					<Icon name={icon} size={ROW_ICON_PX} />
					<span className="wg-ws-row-title">{said}</span>
				</Button>
			))}
		</div>
	);
}
