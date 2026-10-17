import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface NavSegmentProps {
	readonly label: string;
	readonly icon: string;
	readonly isOff: boolean;
	readonly onPress: () => void;
}

const SEGMENT =
	"cv:grid cv:size-10 cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:text-ink cv:shadow-none cv:transition-[background-color,opacity] cv:duration-150 cv:ease-standard cv:hover:bg-fill-hover cv:disabled:cursor-default cv:disabled:bg-transparent cv:disabled:opacity-40 cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

export function NavSegment({ label, icon, isOff, onPress }: NavSegmentProps): ReactElement {
	return (
		<button type="button" aria-label={label} title={label} className={SEGMENT} disabled={isOff} onClick={onPress}>
			<Icon name={icon} size={18} />
		</button>
	);
}
