import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";

export type QuietTone = "ink" | "success" | "error";

export interface QuietActionProps {
	readonly icon?: string;
	readonly label: string;
	readonly tone?: QuietTone;
	readonly onPress: () => void;
}

const QUIET = "cv:h-12 cv:gap-2 cv:px-5 cv:text-[14px] cv:font-medium";
const TEXT_OF_TONE: Readonly<Record<QuietTone, string>> = {
	ink: "cv:text-ink",
	success: "cv:text-success",
	error: "cv:text-error",
};

export function QuietAction({ icon, label, tone = "ink", onPress }: QuietActionProps): ReactElement {
	return (
		<Button variant="outline" className={QUIET} onClick={onPress} data-browser-quiet-action="">
			<span className={`cv:inline-flex cv:items-center cv:gap-2 ${TEXT_OF_TONE[tone]}`}>
				{icon === undefined ? null : <Icon name={icon} size={16} />}
				{label}
			</span>
		</Button>
	);
}
