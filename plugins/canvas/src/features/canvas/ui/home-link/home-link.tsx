import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Pressable, tooltipMarks } from "@widgetarium/kit";
import { HOME_HREF, HOME_ICON, HOME_TITLE } from "../../../../shared/lib/canvas-links.js";
import { useOpensLink } from "../../../../shared/lib/use-opens-link.js";
import { useCanvasView } from "../../lib/canvas-view-context.js";

const ICON_PX = 14;
const SAID = "All canvases";

export function HomeLink(): ReactElement {
	const { tabId } = useCanvasView();
	const openLink = useOpensLink(tabId);
	return (
		<Pressable
			tone="muted"
			className="sumi-canvas-top-button is-home"
			label={SAID}
			{...tooltipMarks({ said: SAID })}
			onClick={(event) => openLink(HOME_HREF, event.metaKey)}
		>
			<Icon name={HOME_ICON} size={ICON_PX} />
			<span>{HOME_TITLE}</span>
		</Pressable>
	);
}
