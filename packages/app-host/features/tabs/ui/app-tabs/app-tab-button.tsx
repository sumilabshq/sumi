import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { AppTab } from "../../../../shared/schema/app-tab.schema.js";

export type TabLook = "shown" | "resting" | "preview";

export interface AppTabButtonProps {
	readonly tab: AppTab;
	readonly look: TabLook;
	readonly onPick: () => void;
}

const TAB =
	"cv:flex cv:h-10 cv:min-w-10 cv:cursor-pointer cv:items-center cv:justify-center cv:gap-1.5 cv:rounded-full cv:border-0 cv:px-3 cv:font-[inherit] cv:text-sm cv:shadow-none cv:transition-[background-color,color] cv:duration-150 cv:ease-standard cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

const LOOK: Readonly<Record<TabLook, string>> = {
	shown: `${TAB} cv:bg-primary cv:font-medium cv:text-primary-foreground`,
	resting: `${TAB} cv:bg-transparent cv:font-normal cv:text-ink cv:hover:bg-fill-hover`,
	preview: `${TAB} cv:bg-transparent cv:font-normal cv:italic cv:text-muted-foreground cv:hover:bg-fill-hover`,
};

export function AppTabButton({ tab, look, onPick }: AppTabButtonProps): ReactElement {
	return (
		<button
			type="button"
			role="tab"
			aria-selected={look === "shown"}
			aria-label={tab.label}
			className={LOOK[look]}
			onClick={onPick}
			data-host-tab={tab.id}
		>
			<Icon name={tab.icon} size={16} />
			{look === "resting" ? null : <span>{tab.label}</span>}
		</button>
	);
}
