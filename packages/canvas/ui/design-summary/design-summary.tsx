import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { designSummaryInject } from "../../widgets/design-summary.widget.js";

const SCREENS_SAID = "{count} screens · {frames} frames · read only";

export function DesignSummary({ getDesign: design }: InjectProps<typeof designSummaryInject>): ReactElement | null {
	if (!design) return null;
	const frames = design.screens.reduce((count, screen) => count + screen.states.length, 0);
	const said = SCREENS_SAID.replace("{count}", String(design.screens.length)).replace("{frames}", String(frames));
	return (
		<>
			<b>{design.app}</b>
			<span className="cv:text-muted-foreground">{said}</span>
		</>
	);
}
