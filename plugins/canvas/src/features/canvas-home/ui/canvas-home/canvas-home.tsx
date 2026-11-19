import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import { HOME_TITLE } from "../../../../shared/lib/canvas-links.js";
import { useRecordsTabTitle } from "../../../../shared/lib/use-records-tab-title.js";
import { TopRow } from "../../../../shared/ui/top-row/top-row.js";
import type { HomeShown } from "../../lib/home-shown.js";
import { AllCanvases } from "../all-canvases/all-canvases.js";
import { HomeCrumb } from "../home-crumb/home-crumb.js";
import { InChatsGrid } from "../in-chats-grid/in-chats-grid.js";
import { InChatsRow } from "../in-chats-row/in-chats-row.js";
import { NewCanvasButton } from "../new-canvas-button/new-canvas-button.js";
import { SearchField } from "../search-field/search-field.js";

export function CanvasHome({ tabId }: { readonly tabId: string }): ReactElement {
	const [shown, setShown] = useState<HomeShown>("all");
	const [words, setWords] = useState("");
	const [scroller, holdScroller] = useState<HTMLDivElement | null>(null);
	useRecordsTabTitle(tabId, HOME_TITLE);
	return (
		<div className="sumi-canvas-home" data-sumi-corner="float">
			<TopRow
				start={<HomeCrumb shown={shown} onAll={() => setShown("all")} />}
				end={
					<Fragment>
						<SearchField words={words} onWords={setWords} />
						<NewCanvasButton tabId={tabId} />
					</Fragment>
				}
			/>
			<div className="sumi-canvas-home-body" ref={holdScroller}>
				<div className="sumi-canvas-home-column">
					{shown === "in-chats" ? (
						<InChatsGrid tabId={tabId} words={words} scroller={scroller} />
					) : (
						<Fragment>
							<InChatsRow tabId={tabId} words={words} onOpenAll={() => setShown("in-chats")} />
							<AllCanvases tabId={tabId} words={words} scroller={scroller} />
						</Fragment>
					)}
				</div>
			</div>
		</div>
	);
}
