import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

interface Granted {
	readonly icon: string;
	readonly label: string;
}

const GROUP = "cv:flex cv:flex-col cv:gap-2";
const LABEL = "cv:text-xs cv:text-muted-foreground";
const ROW = "cv:flex cv:flex-wrap cv:gap-1.5";
const CHIP = "cv:flex cv:h-8 cv:items-center cv:gap-1.5 cv:rounded-full cv:px-3 cv:text-xs";
const GETS_CHIP = `${CHIP} cv:bg-brand-wash cv:text-brand`;
const NEVER_CHIP = `${CHIP} cv:border cv:border-line cv:text-muted-foreground`;

const GETS: readonly Granted[] = [
	{
		icon: "camera",
		label: "A screenshot of the page",
	},
	{
		icon: "file-text",
		label: "Page content",
	},
];

const NEVER: readonly Granted[] = [
	{
		icon: "mouse-pointer",
		label: "Clicks",
	},
	{
		icon: "keyboard",
		label: "Typing",
	},
	{
		icon: "app-window",
		label: "Other tabs",
	},
];

export function AskChips(): ReactElement {
	return (
		<div className={GROUP}>
			<span className={LABEL}>It gets</span>
			<div className={ROW}>
				{GETS.map(({ icon, label }) => (
					<span key={label} className={GETS_CHIP}>
						<Icon name={icon} size={14} />
						{label}
					</span>
				))}
			</div>
			<span className={LABEL}>It never gets</span>
			<div className={ROW}>
				{NEVER.map(({ icon, label }) => (
					<span key={label} className={NEVER_CHIP}>
						<Icon name={icon} size={14} />
						{label}
					</span>
				))}
			</div>
		</div>
	);
}
