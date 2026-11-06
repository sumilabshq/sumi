import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { REFUSAL_HANDLER } from "@widgetarium/data-framework/command-refusals";
import { useQuery } from "@widgetarium/data-framework";
import { ReturnNoteQuery } from "@widgetarium/canvas";
import { RoundButton } from "../round-button/round-button.js";
import { returned } from "../../lib/returned.js";

export interface ReturnToNoteButtonProps {
	readonly cameFrom: string;
	readonly open: (note: string) => Promise<void>;
}

const RETURN_LABEL = "Back to view";

export function ReturnToNoteButton({ cameFrom, open }: ReturnToNoteButtonProps): ReactElement {
	const returnNote = useQuery(ReturnNoteQuery, { cameFrom }).data;
	const onRefused = useContext(REFUSAL_HANDLER);
	const onReturn = (): void => {
		if (returnNote.kind === "none") {
			onRefused({
				name: ReturnNoteQuery.name,
				reason: returnNote.said,
				ran: false,
			});
			return;
		}

		void returned(open(returnNote.note), onRefused);
	};
	return (
		<RoundButton label={RETURN_LABEL} tone="raise" size="l" onClick={onReturn} data-canvas-close="">
			<Icon name="x" size={18} />
		</RoundButton>
	);
}
