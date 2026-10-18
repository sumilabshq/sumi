import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppTab } from "../../schema/app-tab.schema.js";
import { STATUS_SAID, STATUS_TONE } from "../../lib/tab-status/tab-status.js";

const WORDS =
	"cv:flex cv:min-w-0 cv:flex-1 cv:flex-col cv:items-start cv:gap-0.5 cv:text-start cv:text-sm cv:leading-[17px]";
const TITLE = "cv:max-w-full cv:truncate cv:font-medium cv:text-ink";
const SUBTITLE = "cv:font-normal cv:text-muted-foreground";
const STATUS = "cv:truncate cv:text-xs cv:leading-4";

export function TabWords({ tab }: { readonly tab: AppTab }): ReactElement {
	return (
		<span className={WORDS}>
			<span className={TITLE}>
				{tab.title}
				{tab.subtitle === null ? null : (
					<span className={SUBTITLE} data-host-tab-subtitle="">
						{" "}
						· {tab.subtitle}
					</span>
				)}
			</span>
			{tab.status === null ? null : (
				<span className={`${STATUS} ${STATUS_TONE[tab.status]}`} data-host-tab-status-said={tab.status}>
					{STATUS_SAID[tab.status]}
				</span>
			)}
		</span>
	);
}
