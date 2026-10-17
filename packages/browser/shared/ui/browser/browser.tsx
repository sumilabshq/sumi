import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/requests";
import { AskCard } from "../../../features/asks/ui/ask-card/ask-card.js";
import { InkReading } from "../../../features/asks/ui/ink-reading/ink-reading.js";
import { PageArea } from "../../../features/tabs/ui/page-area/page-area.js";

export interface BrowserProps {
	readonly header?: ReactNode;
}

const VIEW =
	"cv:flex cv:h-full cv:w-full cv:flex-col cv:gap-[var(--wg-kit-plate-pad,6px)] cv:overflow-hidden cv:bg-group cv:p-[var(--wg-kit-plate-pad,6px)]";

export function Browser({ header }: BrowserProps): ReactElement {
	return (
		<div className={VIEW} data-browser-view="">
			<Slot loading={null}>{header}</Slot>
			<Slot loading={null}>
				<PageArea>
					<InkReading />
					<AskCard />
				</PageArea>
			</Slot>
		</div>
	);
}
