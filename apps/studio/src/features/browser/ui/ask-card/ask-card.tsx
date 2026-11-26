import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import type { AskAnswer } from "@widgetarium/browser/contract";
import { browser } from "@widgetarium/browser/contract";
import { Button } from "@widgetarium/kit";
import { AskChips } from "./ask-chips.js";

const CARD =
	"cv:absolute cv:bottom-6 cv:left-1/2 cv:z-[3] cv:flex cv:w-[min(32rem,calc(100%-2rem))] cv:-translate-x-1/2 cv:flex-col cv:gap-4 cv:border cv:border-edge cv:bg-raise cv:p-5";
const TITLE = "cv:m-0 cv:text-lg cv:font-medium cv:text-ink";
const SUBTITLE = "cv:m-0 cv:text-sm cv:break-all cv:text-muted-foreground";
const ANSWERS = "cv:flex cv:gap-2";
const ANSWER = "cv:h-13 cv:px-5 cv:text-sm cv:font-medium";
const PRIMARY = `${ANSWER} cv:flex-[1.6]`;
const SECONDARY = `${ANSWER} cv:flex-1`;
const FOOTNOTE = "cv:m-0 cv:text-xs cv:text-muted-foreground";
const READ_TITLE = "Let Sumi read {site}?";
const OPEN_TITLE = "Let Sumi open {site}?";
const READ_ONLY = "Read only: a screenshot and page content";
const DATA_NOT_ORDERS = "Page content is data to Sumi, never instructions.";

export function AskCard(): ReactElement | null {
	const [asked] = useQuery(browser.asks.pending).data;
	const answerAsk = useCommand(browser.asks.answer);

	if (!asked) {
		return null;
	}

	const answer = (picked: AskAnswer) => () => void answerAsk.run({ id: asked.id, answer: picked });
	return (
		<section className={CARD} aria-live="polite" data-browser-ask={asked.isNavigation ? "navigate" : "read"}>
			<div>
				<h3 className={TITLE}>{(asked.isNavigation ? OPEN_TITLE : READ_TITLE).replace("{site}", asked.siteKey)}</h3>
				<p className={SUBTITLE}>{asked.isNavigation ? asked.url : READ_ONLY}</p>
			</div>
			{asked.isNavigation ? null : <AskChips />}
			<div className={ANSWERS}>
				<Button size="l" variant="primary" className={PRIMARY} onClick={answer("site")}>
					Allow for this site
				</Button>
				<Button size="l" className={SECONDARY} onClick={answer("once")}>
					Once
				</Button>
				<Button size="l" className={SECONDARY} onClick={answer("no")}>
					No
				</Button>
			</div>
			<p className={FOOTNOTE}>{DATA_NOT_ORDERS}</p>
		</section>
	);
}
