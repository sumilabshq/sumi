import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { BUTTON_RESET, EDGED } from "../../lib/page-state-look.js";

export type QuietTone = "ink" | "success" | "error";

export interface QuietActionProps {
	readonly icon?: string;
	readonly label: string;
	readonly tone?: QuietTone;
	readonly onPress: () => void;
}

const QUIET = `${BUTTON_RESET} ${EDGED} cv:h-12 cv:gap-2 cv:rounded-full cv:px-5 cv:text-[14px]`;
const TEXT_OF_TONE: Readonly<Record<QuietTone, string>> = {
	ink: "cv:text-ink",
	success: "cv:text-success",
	error: "cv:text-error",
};

export function QuietAction({ icon, label, tone = "ink", onPress }: QuietActionProps): ReactElement {
	return (
		<button type="button" className={`${QUIET} ${TEXT_OF_TONE[tone]}`} onClick={onPress} data-browser-quiet-action="">
			{icon === undefined ? null : <Icon name={icon} size={16} />}
			{label}
		</button>
	);
}
