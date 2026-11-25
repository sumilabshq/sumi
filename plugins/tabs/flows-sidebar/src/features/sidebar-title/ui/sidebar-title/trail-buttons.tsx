import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { appHost } from "@widgetarium/app-host/contract";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";
import { navigation } from "@widgetarium/navigation/contract";
import { useFlowsWindow } from "../../../../shared/lib/use-flows-window.js";
import { useTrailKeys } from "../../lib/use-trail-keys.js";

const BACK = "Back";
const FORWARD = "Forward";
const ICON_PX = 12;

export function TrailButtons(): ReactElement {
	const window = useFlowsWindow();
	const trail = useQuery(navigation.windowTrail.trail, { window }).data;
	const back = useCommand(appHost.flows.back);
	const forward = useCommand(appHost.flows.forward);
	const goBack = (): void => {
		if (trail.canGoBack) {
			void back.run();
		}
	};
	const goForward = (): void => {
		if (trail.canGoForward) {
			void forward.run();
		}
	};
	useTrailKeys({ back: goBack, forward: goForward });
	return (
		<>
			<Button
				shape="square"
				emphasis="ghost"
				size="xs"
				label={BACK}
				{...tooltipMarks({ said: BACK, keys: "⌘[" })}
				disabled={!trail.canGoBack}
				onClick={goBack}
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
				onClick={goForward}
			>
				<Icon name="chevron-right" size={ICON_PX} />
			</Button>
		</>
	);
}
