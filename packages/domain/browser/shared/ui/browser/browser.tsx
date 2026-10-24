import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@widgetarium/core/requests";
import { AskCard } from "../../../features/asks/ui/ask-card/ask-card.js";
import { InkReading } from "../../../features/asks/ui/ink-reading/ink-reading.js";
import { SearchWebAction } from "../../../features/ink/ui/search-web-action/search-web-action.js";
import { InkKeptOut } from "../../../features/sites/ui/ink-kept-out/ink-kept-out.js";
import { PageArea } from "../../../features/tabs/ui/page-area/page-area.js";

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
					<InkKeptOut />
					<InkReading />
					<AskCard />
				</PageArea>
			</Slot>
		</div>
	);
}
