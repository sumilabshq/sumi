import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { BUTTON_RESET } from "../../lib/page-state-look.js";

export interface PrimaryActionProps {
	readonly icon: string;
	readonly label: string;
	readonly onPress: () => void;
	readonly iconSize?: number;
}

const PRIMARY = `${BUTTON_RESET} cv:h-[52px] cv:gap-2.5 cv:rounded-full cv:bg-primary cv:px-6 cv:shadow-none cv:text-[15px] cv:text-primary-foreground`;

export function PrimaryAction({ icon, label, onPress, iconSize = 16 }: PrimaryActionProps): ReactElement {
	return (
		<button type="button" className={PRIMARY} onClick={onPress} data-browser-primary-action="">
			<Icon name={icon} size={iconSize} />
			{label}
		</button>
	);
}
