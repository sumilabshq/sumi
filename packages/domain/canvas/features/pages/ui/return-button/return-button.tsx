import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { useCommand } from "@widgetarium/core/requests";
import { ReturnToViewCommand } from "../../contract.js";
import { RoundButton } from "../../../../shared/ui/round-button/round-button.js";

const RETURN_LABEL = "Back to view";

export function ReturnButton(): ReactElement {
	const returnToView = useCommand(ReturnToViewCommand);
	return (
		<RoundButton
			label={RETURN_LABEL}
			tone="raise"
			size="l"
			onClick={() => void returnToView.run()}
			data-canvas-close=""
		>
			<Icon name="x" size={18} />
		</RoundButton>
	);
}
