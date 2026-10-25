import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, tooltipMarks } from "@widgetarium/kit";

const CHIP =
	"cv:inline-flex cv:h-7 cv:flex-none cv:cursor-pointer cv:items-center cv:gap-1.5 cv:rounded-full cv:border-0 cv:bg-transparent cv:px-2.5 cv:py-0 cv:font-[inherit] cv:text-[12px] cv:font-medium cv:whitespace-nowrap cv:text-muted-foreground cv:shadow-[inset_0_0_0_1px_var(--border)] cv:hover:text-ink cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";
const CHIP_LABEL = "Sumi kept out";
const CHIP_TIP = "Sumi can't look at {host}. Your page still loads for you.";

export interface KeptOutPressProps {
	readonly host: string;
}

export function KeptOutPress({ host }: KeptOutPressProps): ReactElement {
	return (
		<button
			type="button"
			className={CHIP}
			data-browser-kept-out=""
			{...tooltipMarks({
				said: CHIP_TIP.replace("{host}", host),
				keys: null,
			})}
		>
			<Icon name="eye-off" size={14} />
			{CHIP_LABEL}
		</button>
	);
}
