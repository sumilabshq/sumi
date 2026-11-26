import { createElement as h, Fragment, useContext } from "react";
import type { ReactElement } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";
import { FlowsWindowContext } from "../../lib/flows-window.js";
import { useTrail } from "../../lib/use-trail.js";

const BACK = "Back";
const FORWARD = "Forward";
const ICON_PX = 14;

export function TrailButtons(): ReactElement | null {
	const window = useContext(FlowsWindowContext);

	if (window === null) {
		return null;
	}

	return <WindowTrailButtons window={window} />;
}

function WindowTrailButtons({ window }: { readonly window: string }): ReactElement {
	const trail = useTrail(window);
	return (
		<Fragment>
			<Button
				shape="square"
				emphasis="ghost"
				size="xs"
				label={BACK}
				{...tooltipMarks({ said: BACK, keys: "⌘[" })}
				disabled={!trail.canGoBack}
				onClick={trail.goBack}
			>
				<Icon name="chevron-left" size={ICON_PX} />
			</Button>
			<Button
				shape="square"
				emphasis="ghost"
				size="xs"
				label={FORWARD}
				{...tooltipMarks({ said: FORWARD, keys: "⌘]" })}
				disabled={!trail.canGoForward}
				onClick={trail.goForward}
			>
				<Icon name="chevron-right" size={ICON_PX} />
			</Button>
		</Fragment>
	);
}
