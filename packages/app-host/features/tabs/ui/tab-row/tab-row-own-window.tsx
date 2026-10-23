import { createElement as h } from "react";
import type { ReactElement } from "react";
import { tooltipMarks } from "@widgetarium/kit";

const IN_ANOTHER_WINDOW = "Open in another window";
const MARK =
	"cv:ms-auto cv:inline-flex cv:size-[18px] cv:flex-none cv:items-center cv:justify-center cv:text-[color-mix(in_srgb,var(--sumi-text)_38%,var(--sumi-frame))] cv:group-hover/row:hidden";

export function TabRowOwnWindow(): ReactElement {
	return (
		<span
			className={MARK}
			aria-label={IN_ANOTHER_WINDOW}
			{...tooltipMarks({ said: IN_ANOTHER_WINDOW })}
			data-tabs-own-window=""
		>
			<svg width="11" height="10" viewBox="0 0 14 12" aria-hidden="true">
				<path
					fill="currentColor"
					fillRule="evenodd"
					d="M2.5 0h9A2.5 2.5 0 0 1 14 2.5v7A2.5 2.5 0 0 1 11.5 12h-9A2.5 2.5 0 0 1 0 9.5v-7A2.5 2.5 0 0 1 2.5 0zM1.6 4.2v5.3c0 .5.4.9.9.9h9c.5 0 .9-.4.9-.9V4.2z"
				/>
			</svg>
		</span>
	);
}
