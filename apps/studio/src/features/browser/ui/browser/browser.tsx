import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/framework";
import { AskCard } from "../ask-card/ask-card.js";
import { InkReading } from "../ink-reading/ink-reading.js";
import { SearchWebAction } from "../search-web-action/search-web-action.js";
import { PageArea } from "../page-area/page-area.js";

export interface BrowserProps {
	readonly header?: ReactNode;
}

const VIEW = "cv:flex cv:h-full cv:w-full cv:flex-col cv:overflow-hidden";

export function Browser({ header }: BrowserProps): ReactElement {
	return (
		<div className={VIEW} data-browser-view="">
			<Slot loading={null}>{header}</Slot>
			<Slot loading={null}>
				<PageArea searchFor={(text) => <SearchWebAction text={text} />}>
					<InkReading />
					<AskCard />
				</PageArea>
			</Slot>
		</div>
	);
}
