import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { REFUSAL_HANDLER } from "@widgetarium/framework/command-refusals";
import { RoundButton } from "../round-button/round-button.js";
import { useCanvasSurroundings } from "../../lib/canvas-surroundings.js";
import { ReturnToNoteButton } from "./return-to-note-button.js";
import { returned } from "../../lib/returned.js";

const RETURN_LABEL = "Back to view";

export function ReturnButton(): ReactElement {
	const { returnTo } = useCanvasSurroundings();
	const onRefused = useContext(REFUSAL_HANDLER);

	if (returnTo.kind === "note") {
		return <ReturnToNoteButton cameFrom={returnTo.cameFrom} open={returnTo.open} />;
	}

	return (
		<RoundButton
			label={RETURN_LABEL}
			tone="raise"
			size="l"
			onClick={() => void returned(returnTo.open(), onRefused)}
			data-canvas-close=""
		>
			<Icon name="x" size={18} />
		</RoundButton>
	);
}
