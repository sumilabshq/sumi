import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { ReadKind } from "../../../../shared/schema/site-access.schema.js";
import { InkReadingQuery, StopInkCommand } from "../../contract.js";

const PILL =
	"cv:absolute cv:bottom-6 cv:left-1/2 cv:z-[2] cv:flex cv:h-12 cv:-translate-x-1/2 cv:items-center cv:gap-3 cv:rounded-full cv:bg-ink cv:ps-5 cv:pe-1 cv:text-sm cv:whitespace-nowrap cv:text-page";
const STOP =
	"cv:h-10 cv:cursor-pointer cv:rounded-full cv:border-0 cv:bg-page cv:px-4 cv:font-[inherit] cv:text-sm cv:font-medium cv:text-ink cv:shadow-none cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

const DOING: Readonly<Record<ReadKind, string>> = {
	content: "Ink is reading page content",
	screenshot: "Ink is taking a screenshot",
	navigate: "Ink is opening a page",
};

export function InkReading(): ReactElement | null {
	const reading = useQuery(InkReadingQuery).data;
	const stopInk = useCommand(StopInkCommand);

	if (reading === null) {
		return null;
	}

	return (
		<div className={PILL} role="status" data-browser-ink-reading={reading.kind}>
			<span>{DOING[reading.kind]}</span>
			<button type="button" className={STOP} onClick={() => void stopInk.run()}>
				Stop
			</button>
		</div>
	);
}
