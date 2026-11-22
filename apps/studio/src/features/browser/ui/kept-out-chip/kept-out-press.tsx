import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";

const CHIP = "cv:h-7 cv:flex-none cv:gap-1.5 cv:px-2.5 cv:text-[12px] cv:font-medium";
const CHIP_LABEL = "Sumi kept out";
const CHIP_TIP = "Sumi can't look at {host}. Your page still loads for you.";

export interface KeptOutPressProps {
	readonly host: string;
}

export function KeptOutPress({ host }: KeptOutPressProps): ReactElement {
	return (
		<Button
			variant="outline-muted"
			className={CHIP}
			data-browser-kept-out=""
			{...tooltipMarks({
				said: CHIP_TIP.replace("{host}", host),
				keys: null,
			})}
		>
			<Icon name="eye-off" size={14} />
			{CHIP_LABEL}
		</Button>
	);
}
