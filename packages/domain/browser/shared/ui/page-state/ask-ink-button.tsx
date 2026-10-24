import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MascotFigure } from "@widgetarium/mascot";
import { BUTTON_RESET, WASH_INK } from "../../lib/page-state-look.js";

export interface AskInkButtonProps {
	readonly label: string;
	readonly onPress: () => void;
}

const ASK = `${BUTTON_RESET} ${WASH_INK} cv:h-12 cv:gap-2 cv:rounded-full cv:shadow-none cv:ps-2.5 cv:pe-5 cv:text-[14px]`;
const INK = "cv:me-0.5 cv:flex-none";
const INK_PX = 32;

export function AskInkButton({ label, onPress }: AskInkButtonProps): ReactElement {
	return (
		<button type="button" className={ASK} onClick={onPress} data-browser-ask-ink="">
			<span className={INK}>
				<MascotFigure outfit="bare" size={INK_PX} state="idle" />
			</span>
			{label}
		</button>
	);
}
