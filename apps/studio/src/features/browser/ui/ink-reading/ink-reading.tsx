import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import type { ReadKind } from "@widgetarium/browser/contract";
import { browser } from "@widgetarium/browser/contract";
import { Button } from "@widgetarium/kit";

const PILL =
	"cv:absolute cv:bottom-6 cv:left-1/2 cv:z-[2] cv:flex cv:h-12 cv:-translate-x-1/2 cv:items-center cv:gap-3 cv:bg-ink cv:ps-5 cv:pe-1 cv:text-sm cv:whitespace-nowrap cv:text-page";

const STOP = "cv:h-10 cv:px-4 cv:text-sm cv:font-medium";
const DOING: Readonly<Record<ReadKind, string>> = {
	content: "Sumi is reading page content",
	screenshot: "Sumi is taking a screenshot",
	navigate: "Sumi is opening a page",
};

export function InkReading(): ReactElement | null {
	const reading = useQuery(browser.asks.inkReading).data;
	const stopInk = useCommand(browser.asks.stopInk);

	if (reading === null) {
		return null;
	}

	return (
		<div className={PILL} role="status" data-browser-ink-reading={reading.kind}>
			<span>{DOING[reading.kind]}</span>
			<Button variant="page" className={STOP} onClick={() => void stopInk.run()}>
				Stop
			</Button>
		</div>
	);
}
