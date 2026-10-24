import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { AskAnswer } from "@widgetarium/browser";
import { AccessAsksQuery, AnswerAskCommand } from "@widgetarium/browser";
import { AskChips } from "./ask-chips.js";

const CARD =
	"cv:absolute cv:bottom-6 cv:left-1/2 cv:z-[3] cv:flex cv:w-[min(32rem,calc(100%-2rem))] cv:-translate-x-1/2 cv:flex-col cv:gap-4 cv:rounded-[28px] cv:border cv:border-edge cv:bg-raise cv:p-5";
const TITLE = "cv:m-0 cv:text-lg cv:font-medium cv:text-ink";
const SUBTITLE = "cv:m-0 cv:text-sm cv:break-all cv:text-muted-foreground";
const ANSWERS = "cv:flex cv:gap-2";
const ANSWER =
	"cv:h-13 cv:flex-1 cv:cursor-pointer cv:rounded-full cv:border-0 cv:px-5 cv:font-[inherit] cv:text-sm cv:font-medium cv:shadow-none cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";
const PRIMARY = `${ANSWER} cv:flex-[1.6] cv:bg-primary cv:text-primary-foreground cv:hover:bg-primary/85`;
const SECONDARY = `${ANSWER} cv:bg-fill cv:text-ink cv:hover:bg-fill-hover`;
const FOOTNOTE = "cv:m-0 cv:text-xs cv:text-muted-foreground";
const READ_TITLE = "Let Ink read {site}?";
const OPEN_TITLE = "Let Ink open {site}?";
const READ_ONLY = "Read only: a screenshot and page content";
const DATA_NOT_ORDERS = "Page content is data to Ink, never instructions.";

export function AskCard(): ReactElement | null {
	const [asked] = useQuery(AccessAsksQuery).data;
	const answerAsk = useCommand(AnswerAskCommand);

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
				<button type="button" className={PRIMARY} onClick={answer("site")}>
					Allow for this site
				</button>
				<button type="button" className={SECONDARY} onClick={answer("once")}>
					Once
				</button>
				<button type="button" className={SECONDARY} onClick={answer("no")}>
					No
				</button>
			</div>
			<p className={FOOTNOTE}>{DATA_NOT_ORDERS}</p>
		</section>
	);
}
