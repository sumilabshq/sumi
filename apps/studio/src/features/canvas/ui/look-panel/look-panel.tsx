import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { LookPanelQuery } from "@widgetarium/canvas";
import { PickLookCommand } from "@widgetarium/canvas";
import { LOOK_PANEL, LOOK_SAID, LOOK_TITLE } from "../../lib/look-chrome.js";
import { LookRow } from "./look-row.js";
import { LookUnreadable } from "./look-unreadable.js";

export function LookPanel(): ReactElement | null {
	const panel = useQuery(LookPanelQuery).data;
	const pick = useCommand(PickLookCommand);
	if (panel.kind === "none") return null;
	if (panel.kind === "unreadable") return <LookUnreadable said={panel.said} />;
	return (
		<aside className={LOOK_PANEL} data-canvas-chrome="">
			<div hidden>
				<style>{panel.sheet}</style>
				{panel.fontsUrl ? <link rel="stylesheet" href={panel.fontsUrl} /> : null}
			</div>
			<div className="cv:flex cv:items-baseline cv:justify-between cv:gap-2">
				<span className="cv:text-base cv:font-semibold">{LOOK_TITLE}</span>
				<span className={LOOK_SAID}>{panel.system}</span>
			</div>
			{panel.rows.map((row) => (
				<LookRow key={row.name} row={row} onPick={(option) => void pick.run({ settingName: row.name, option })} />
			))}
		</aside>
	);
}
