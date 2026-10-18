import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { BUTTON_RESET, EDGED } from "../../lib/page-state-look.js";

export interface QuietActionProps {
	readonly icon?: string;
	readonly label: string;
	readonly onPress: () => void;
}

const QUIET = `${BUTTON_RESET} ${EDGED} cv:h-12 cv:gap-2 cv:rounded-full cv:px-5 cv:text-[14px]`;

export function QuietAction({ icon, label, onPress }: QuietActionProps): ReactElement {
	return (
		<button type="button" className={QUIET} onClick={onPress} data-browser-quiet-action="">
			{icon === undefined ? null : <Icon name={icon} size={16} />}
			{label}
		</button>
	);
}
