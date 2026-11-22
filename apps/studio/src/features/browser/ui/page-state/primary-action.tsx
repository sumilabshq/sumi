import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";

const PRIMARY = "cv:h-[52px] cv:gap-2.5 cv:px-6 cv:text-[15px] cv:font-medium";

export interface PrimaryActionProps {
	readonly icon: string;
	readonly label: string;
	readonly onPress: () => void;
	readonly iconSize?: number;
}

export function PrimaryAction({ icon, label, onPress, iconSize = 16 }: PrimaryActionProps): ReactElement {
	return (
		<Button variant="primary" className={PRIMARY} onClick={onPress} data-browser-primary-action="">
			<Icon name={icon} size={iconSize} />
			{label}
		</Button>
	);
}
