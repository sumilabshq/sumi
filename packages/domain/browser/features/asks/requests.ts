import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { InkActivityChangedEvent } from "../../gateways/ink-activity/ink-activity.events.js";
import { AccessAsksChangedEvent } from "../../gateways/access-asks/access-asks.events.js";
import { BrowserGrantsGateway } from "../../gateways/browser-grants/browser-grants.gateway.js";
import { OnceAllowancesGateway } from "../../gateways/once-allowances/once-allowances.gateway.js";
import { onceToWrite, siteLevelToWrite } from "../../shared/lib/grant-changes.js";
import { activityWith, isSameActivity } from "../../shared/lib/ink-activity.js";
import { liveOnce, onceAllowanceOf } from "../../shared/lib/once-grants.js";
import { AccessAsksSchema, AnswerAskSchema } from "../../shared/schema/access-ask.schema.js";
import type { AccessAsk } from "../../shared/schema/access-ask.schema.js";
import { InkReadingSchema } from "../../shared/schema/browser-tab.schema.js";

interface Answering {
	readonly browserGrants: BrowserGrantsGateway;
	readonly onceAllowances: OnceAllowancesGateway;
	readonly now: number;
}

const ALREADY_ANSWERED = "that question was already answered";
const ALLOWED_WHEN_ASKED = "allowed for this site when Sumi asked";

export const AccessAsksQuery = query("access-asks")
	.public()
	.output(AccessAsksSchema)
	.settlesNow()
	.handle((_input, { accessAsks }) => accessAsks.accessAsks());

export const InkReadingQuery = query("ink-reading")
	.public()
	.output(InkReadingSchema.nullable())
	.settlesNow()
	.handle((_input, { inkActivity }) => inkActivity.inkActivity().reading);

export const AnswerAskCommand = command("answer-ask")
	.public()
	.input(AnswerAskSchema)
	.idempotencyKey((input) => input.id)
	.handle(({ id, answer }, { accessAsks, browserGrants, onceAllowances, clock, invalidate }) => {
		invalidate(AccessAsksQuery);
		const asked = accessAsks.accessAsks().find((ask) => ask.id === id);

		if (asked === undefined) {
			return refuse(ALREADY_ANSWERED);
		}

		const answering = {
			browserGrants,
			onceAllowances,
			now: clock.now(),
		};

		if (answer === "site") {
			allowSite(asked, answering);
		}

		if (answer === "once") {
			allowOnce(asked, answering);
		}

		accessAsks.saveAnswer(id, answer);
		console.info(`[widgetarium] browser ask ${id} for ${asked.siteKey} waiting → ${answer}`);
	});

export const StopInkCommand = command("stop-ink")
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { inkActivity, clock }) => {
		const was = inkActivity.inkActivity();
		const stopped = activityWith(was, {
			stoppedAt: clock.now(),
			reading: null,
		});

		if (isSameActivity(was, stopped)) {
			return;
		}

		inkActivity.saveInkActivity(stopped);
		console.info(
			`[widgetarium] ink stopped at ${was.stoppedAt ?? "never"} → ${stopped.stoppedAt ?? "never"} (by the person)`,
		);
	});

export const RereadAccessAsksSubscriber = subscriber(AccessAsksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(AccessAsksQuery);
});

export const RereadInkReadingSubscriber = subscriber(InkActivityChangedEvent).handle((_input, { invalidate }) => {
	invalidate(InkReadingQuery);
});

function allowSite(asked: AccessAsk, { browserGrants, now }: Answering): void {
	const written = siteLevelToWrite(browserGrants.grants(), {
		siteKey: asked.siteKey,
		level: "allowed",
		by: "ask",
		reason: ALLOWED_WHEN_ASKED,
		at: now,
	});

	if (written === null) {
		console.info(`[widgetarium] site ${asked.siteKey} allow skipped: already allowed when asked`);
		return;
	}

	browserGrants.saveGrants(written.grants, written.change);
	console.info(`[widgetarium] site ${asked.siteKey} ${written.change.was ?? "none"} → allowed (${ALLOWED_WHEN_ASKED})`);
}

function allowOnce(asked: AccessAsk, { browserGrants, onceAllowances, now }: Answering): void {
	const allowance = onceAllowanceOf(asked.siteKey, asked.tabId, now);
	const written = onceToWrite(browserGrants.grants(), allowance);
	const was = onceAllowances.onceAllowances();
	const kept = [...liveOnce(was, now), allowance];
	browserGrants.saveGrants(written.grants, written.change);
	onceAllowances.saveOnceAllowances(kept);
	console.info(`[widgetarium] browser once allowances ${was.length} → ${kept.length} (allowed once)`);
}
