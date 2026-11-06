import { Repeatable, command, query, subscriber } from "@widgetarium/data-framework";
import { offsetOfCursor, pageAt } from "@widgetarium/core/gateway/page.js";
import { AgentJobsGateway } from "../../gateways/agent-jobs/agent-jobs.gateway.js";
import { JobsChangedEvent } from "../../gateways/agent-jobs/agent-jobs.events.js";
import { CanvasMomentChangedEvent } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { CanvasMomentGateway } from "../../gateways/canvas-moment/canvas-moment.gateway.js";
import { DesignChangedEvent } from "../../gateways/design-folder/design-folder.events.js";
import { DesignFolderGateway } from "../../gateways/design-folder/design-folder.gateway.js";
import { COMPONENTS_PAGE } from "../../shared/schema/canvas-page.schema.js";
import {
	PageAskSchema,
	PageChoicesSchema,
	PagesAskSchema,
	PagesPageSchema,
	ReturnNoteAskSchema,
	ReturnNoteSchema,
	ScreenAskSchema,
	VariantsSchema,
	WidgetAskSchema,
} from "../../shared/schema/pages.schema.js";
import { PAGE_FIELDS, pagesNowOf } from "../../shared/lib/pages/pages-now.js";
import { pageTurnWhileRead } from "../../shared/lib/pages/page-turn.js";
import { pageChoicesOf } from "../../shared/lib/pages/page-choices.js";
import { isTouching, momentWriteOf, pageTurnedTo } from "../../shared/lib/view/canvas-moment.js";
import { noteToReturnTo } from "./lib/note-to-return-to.js";
import { variantsOf } from "./lib/variants-of.js";

const SPEC_REFUSED = "The spec of {app} cannot be read: {why}";
const NO_NOTE_TO_RETURN_TO = "{app} has no page with a note to go back to.";

const PAGES_READ = {
	canvasMoment: CanvasMomentGateway,
	designFolder: DesignFolderGateway,
	agentJobs: AgentJobsGateway,
};

export const PageChoicesQuery = query("page-choices")
	.output(PageChoicesSchema)
	.inject(PAGES_READ)
	.handle(async (_input, { canvasMoment, designFolder, agentJobs }) => {
		const moment = canvasMoment.moment();
		const { pages } = pagesNowOf(moment, await designFolder.folder(moment.app), agentJobs.jobsOf(moment.app));
		return pageChoicesOf(pages);
	});

export const PagesQuery = query("pages")
	.input(PagesAskSchema)
	.output(PagesPageSchema)
	.inject(PAGES_READ)
	.handle(async ({ cursor, limit }, { canvasMoment, designFolder, agentJobs }) => {
		const moment = canvasMoment.moment();
		const { pages } = pagesNowOf(moment, await designFolder.folder(moment.app), agentJobs.jobsOf(moment.app));
		const offset = offsetOfCursor(cursor);
		const rows = pages.screens.slice(offset, offset + limit).map((page) => ({
			page,
			isRunning: page in pages.running,
			isShown: page === pages.shown,
		}));
		return pageAt(rows, offset, pages.screens.length);
	});

export const VariantsQuery = query("variants")
	.output(VariantsSchema)
	.inject(PAGES_READ)
	.handle(async (_input, { canvasMoment, designFolder, agentJobs }) => {
		const moment = canvasMoment.moment();
		const { pages } = pagesNowOf(moment, await designFolder.folder(moment.app), agentJobs.jobsOf(moment.app));
		return variantsOf(pages);
	});

export const ReturnNoteQuery = query("return-note")
	.input(ReturnNoteAskSchema)
	.output(ReturnNoteSchema)
	.inject(PAGES_READ)
	.handle(async ({ cameFrom }, { canvasMoment, designFolder, agentJobs }) => {
		const moment = canvasMoment.moment();
		const { app } = moment;
		const [folder, spec] = await Promise.all([designFolder.folder(app), designFolder.spec(app)]);

		if (spec?.refusal !== undefined) {
			return {
				kind: "none" as const,
				said: SPEC_REFUSED.replace("{app}", app).replace("{why}", spec.refusal),
			};
		}

		const { pages } = pagesNowOf(moment, folder, agentJobs.jobsOf(app));
		const note = noteToReturnTo(spec?.spec.pages ?? [], pages.shown, cameFrom);

		if (note === null) {
			return {
				kind: "none" as const,
				said: NO_NOTE_TO_RETURN_TO.replace("{app}", app),
			};
		}

		return {
			kind: "note" as const,
			note,
		};
	});

export const ShowPageCommand = command("show-page")
	.input(PageAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle(({ page }, { canvasMoment }) => {
		const moment = canvasMoment.moment();
		const write = momentWriteOf(moment, pageTurnedTo(moment, page), `show ${page}`);

		if (write === null) {
			console.info(`[widgetarium] canvas show ${page} skipped: already shown`);
			return;
		}

		canvasMoment.saveMoment(write);

		if (write.said !== null) {
			console.info(`[widgetarium] ${write.said}`);
		}
	});

export const FocusWidgetCommand = command("focus-widget")
	.input(WidgetAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle(({ widget }, { canvasMoment }) => {
		const moment = canvasMoment.moment();
		const change = {
			...pageTurnedTo(moment, COMPONENTS_PAGE),
			focusedWidget: widget,
		};
		const write = momentWriteOf(moment, change, `open ${widget}`);

		if (write === null) {
			console.info(`[widgetarium] canvas open ${widget} skipped: already in focus`);
			return;
		}

		canvasMoment.saveMoment(write);

		if (write.said !== null) {
			console.info(`[widgetarium] ${write.said}`);
		}
	});

export const FinishFlightCommand = command("finish-flight")
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle((_input, { canvasMoment }) => {
		const write = momentWriteOf(canvasMoment.moment(), { focusedWidget: null }, "flown to the widget");

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const PickVariantCommand = command("pick-variant")
	.input(ScreenAskSchema)
	.idempotencyKey(Repeatable)
	.inject(PAGES_READ)
	.handle(async ({ screen }, { canvasMoment, designFolder, agentJobs }) => {
		const asked = canvasMoment.moment();
		const folder = await designFolder.folder(asked.app);
		const moment = canvasMoment.moment();

		const turned = pageTurnWhileRead(asked, moment, `show ${screen}`);

		if (turned !== null) {
			console.info(`[widgetarium] ${turned}`);
			return;
		}

		const { shown } = pagesNowOf(moment, folder, agentJobs.jobsOf(moment.app)).pages;
		const variants = {
			...moment.variants,
			[shown]: screen,
		};
		const write = momentWriteOf(moment, { variants }, `show ${screen} on ${shown}`);

		if (write === null) {
			console.info(`[widgetarium] canvas show ${screen} skipped: already shown on ${shown}`);
			return;
		}

		canvasMoment.saveMoment(write);

		if (write.said !== null) {
			console.info(`[widgetarium] ${write.said}`);
		}
	});

export const RereadPagesSubscriber = subscriber(CanvasMomentChangedEvent).handle(({ fields }, { invalidate }) => {
	if (!isTouching(fields, PAGE_FIELDS)) {
		return;
	}

	invalidate(PageChoicesQuery);
	invalidate(PagesQuery);
	invalidate(VariantsQuery);
	invalidate(ReturnNoteQuery);
});

export const RereadPagesForDesignSubscriber = subscriber(DesignChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PageChoicesQuery);
	invalidate(PagesQuery);
	invalidate(VariantsQuery);
	invalidate(ReturnNoteQuery);
});

export const RereadPagesForJobsSubscriber = subscriber(JobsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PageChoicesQuery);
	invalidate(PagesQuery);
	invalidate(VariantsQuery);
	invalidate(ReturnNoteQuery);
});
