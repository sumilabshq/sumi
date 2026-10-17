import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { RoundButton } from "@widgetarium/canvas";
import { useCommand } from "@widgetarium/core/requests";
import { ClosePanelCommand } from "../../contract.js";

const CLOSE_LABEL = "Back to view";

export function ClosePanelButton(): ReactElement {
	const closePanel = useCommand(ClosePanelCommand);
	return (
		<RoundButton label={CLOSE_LABEL} tone="raise" size="l" onClick={() => void closePanel.run()} data-host-close="">
			<Icon name="x" size={18} />
		</RoundButton>
	);
}
