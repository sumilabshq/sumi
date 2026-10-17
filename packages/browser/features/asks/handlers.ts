import { handler, refuse } from "@widgetarium/core/requests";
import { BrowserGrantsGateway } from "../../gateways/browser-grants/browser-grants.gateway.js";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { BrowserAsksStore } from "../../shared/lib/browser-asks-store.js";
import { onceToWrite, siteLevelToWrite } from "../../shared/lib/grant-changes.js";
import { InkActivityStore } from "../../shared/lib/ink-activity-store.js";
import { OnceAllowancesStore } from "../../shared/lib/once-allowances-store.js";
import { liveOnce, onceAllowanceOf } from "../../shared/lib/once-grants.js";
import type { AccessAsk } from "../../shared/schema/access-ask.schema.js";
import { BrowserClientModule } from "../../module.js";
import { AccessAsksQuery, AnswerAskCommand, InkReadingQuery, StopInkCommand } from "./contract.js";

interface Answering {
	readonly browserGrantsGateway: BrowserGrantsGateway;
	readonly onceAllowancesStore: OnceAllowancesStore;
	readonly now: number;
}

const ALREADY_ANSWERED = "that question was already answered";
const ALLOWED_WHEN_ASKED = "allowed for this site when Ink asked";
const ALLOWED_ONCE = "allowed once";
const STOPPED_BY_PERSON = "the person stopped ink";

export const AccessAsksQueryHandler = handler(AccessAsksQuery, BrowserClientModule)
	.inject({ browserAsksStore: BrowserAsksStore })
	.watch((_input, { browserAsksStore }, changed) => browserAsksStore.watch(changed))
	.handle((_input, { browserAsksStore }) => browserAsksStore.asks());

export const AnswerAskCommandHandler = handler(AnswerAskCommand, BrowserClientModule)
	.inject({
		browserAsksStore: BrowserAsksStore,
		browserGrantsGateway: BrowserGrantsGateway,
		onceAllowancesStore: OnceAllowancesStore,
		clockGateway: ClockGateway,
	})
	.handle(({ id, answer }, { browserAsksStore, browserGrantsGateway, onceAllowancesStore, clockGateway }) => {
		const asked = browserAsksStore.asks().find((ask) => ask.id === id);

		if (!asked) {
			return refuse(ALREADY_ANSWERED);
		}

		const answering = {
			browserGrantsGateway,
			onceAllowancesStore,
			now: clockGateway.now(),
		};

		if (answer === "site") {
			allowSite(asked, answering);
		}

		if (answer === "once") {
			allowOnce(asked, answering);
		}

		browserAsksStore.settle(id, answer);
	});

export const StopInkCommandHandler = handler(StopInkCommand, BrowserClientModule)
	.inject({
		inkActivityStore: InkActivityStore,
		clockGateway: ClockGateway,
	})
	.handle((_input, { inkActivityStore, clockGateway }) =>
		inkActivityStore.change(
			{
				stoppedAt: clockGateway.now(),
				reading: null,
			},
			STOPPED_BY_PERSON,
		),
	);

export const InkReadingQueryHandler = handler(InkReadingQuery, BrowserClientModule)
	.inject({ inkActivityStore: InkActivityStore })
	.watch((_input, { inkActivityStore }, changed) => inkActivityStore.watch(changed))
	.handle((_input, { inkActivityStore }) => inkActivityStore.now().reading);

function allowSite(asked: AccessAsk, { browserGrantsGateway, now }: Answering): void {
	const written = siteLevelToWrite(browserGrantsGateway.readGrants(), {
		siteKey: asked.siteKey,
		level: "allowed",
		by: "ask",
		reason: ALLOWED_WHEN_ASKED,
		at: now,
	});

	if (written === null) {
		return;
	}

	browserGrantsGateway.writeGrantChange(written.grants, written.change);
}

function allowOnce(asked: AccessAsk, { browserGrantsGateway, onceAllowancesStore, now }: Answering): void {
	const allowance = onceAllowanceOf(asked.siteKey, asked.tabId, now);
	const written = onceToWrite(browserGrantsGateway.readGrants(), allowance);
	browserGrantsGateway.writeGrantChange(written.grants, written.change);
	onceAllowancesStore.keep([...liveOnce(onceAllowancesStore.allowances(), now), allowance], ALLOWED_ONCE);
}
