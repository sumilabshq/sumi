import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import type { InjectProps } from "@widgetarium/core";
import type { pageTabsInject } from "../../widgets/page-tabs.widget.js";
import { SaidLine } from "../said-line/said-line.js";
import { useRefusal } from "../said-line/use-refusal.js";
import { fadedTurn } from "./faded-turn.js";
import { PageLabel } from "./page-label.js";
import { PageSwitch } from "./page-switch.js";
import type { CanvasTab } from "./page-switch.js";

export function PageTabs({
	getPages: pages,
	showPage,
	returnToView,
}: InjectProps<typeof pageTabsInject>): ReactElement | null {
	const anchor = useRef<HTMLSpanElement | null>(null);
	const { refusal, heard } = useRefusal();
	if (!pages) return null;
	const onPage = (page: string): void => fadedTurn(anchor.current, () => heard(showPage({ page })));
	return (
		<span ref={anchor} className="cv:flex cv:items-center cv:gap-2">
			<SaidLine said={refusal} />
			<PageSwitch
				leading={pages.leading.map(tabOf)}
				pages={pages.screens.map((page) => ({
					value: page,
					label: <PageLabel page={page} isRunning={page in pages.running} />,
				}))}
				trailing={pages.trailing.map(tabOf)}
				page={pages.shown}
				onPage={onPage}
				onReturn={() => heard(returnToView())}
			/>
		</span>
	);
}

function tabOf(page: string): CanvasTab {
	return { value: page, label: page };
}
