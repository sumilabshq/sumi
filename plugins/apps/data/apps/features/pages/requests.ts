import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import type { Send, User } from "@widgetarium/data-framework";
import { AppTabQuery } from "@widgetarium/places";
import { command, query } from "#module";
import {
	AppPageAskSchema,
	AppPageSchema,
	PressAppActionSchema,
	RecordedAppPageSchema,
	TakeActionPressSchema,
	TakenPressSchema,
} from "../../shared/schema/page.schema.js";
import { pressTakenFrom, refusePress, withPressQueued } from "./lib/presses.js";

const NOT_ITS_TAB = "tab {id} does not hold the app {app}";
const ONLY_SHELL_PRESSES = "the app {app} cannot press header actions: only the shell presses them";

export const AppPageQuery = query("app-page")
	.public()
	.input(AppPageAskSchema)
	.output(AppPageSchema)
	.handle(async ({ id }, { pages, send, user }) => {
		await refuseForeignTab(send, user, id);
		return pages.page(id);
	});

export const RecordAppPageCommand = command("record-app-page")
	.public()
	.input(RecordedAppPageSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, actions }, { pages, send, user, invalidate }) => {
		await refuseForeignTab(send, user, id);
		const was = pages.page(id);
		const reason = `tab ${id} actions ${idsOf(was.actions)} → ${idsOf(actions)} (the page reported them)`;
		pages.savePage(id, { ...was, actions }, reason);
		console.info(`[apps] ${reason}`);
		invalidate(AppPageQuery, { id });
	});

export const PressAppActionCommand = command("press-app-action")
	.public()
	.input(PressAppActionSchema)
	.idempotencyKey(PerCall)
	.handle(({ tab, action }, { pages, user, invalidate }) => {
		if (user !== null) {
			return refuse(ONLY_SHELL_PRESSES.replace("{app}", user.id));
		}

		const was = pages.page(tab);
		const refusal = refusePress(was, tab, action);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const minted = pages.mintedPresses() + 1;
		const press = { id: `press-${minted}`, action };
		const reason = `tab ${tab} presses +${press.id} ${action}`;
		pages.savePressesMinted(minted);
		pages.savePage(tab, withPressQueued(was, press), reason);
		console.info(`[apps] ${reason}`);
		invalidate(AppPageQuery, { id: tab });
	});

export const TakeActionPressCommand = command("take-action-press")
	.public()
	.input(TakeActionPressSchema)
	.output(TakenPressSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ id, press }, { pages, send, user, invalidate }) => {
		await refuseForeignTab(send, user, id);
		const taken = pressTakenFrom(pages.page(id), id, press);

		if (typeof taken === "string") {
			return refuse(taken);
		}

		const reason = `tab ${id} presses -${press} ${taken.press.action} (taken by the app)`;
		pages.savePage(id, taken.page, reason);
		console.info(`[apps] ${reason}`);
		invalidate(AppPageQuery, { id });
		return taken.press;
	});

async function refuseForeignTab(send: Send, user: User | null, id: string): Promise<void> {
	if (user === null) {
		return;
	}

	const tab = await send(AppTabQuery, { id });

	if (tab.app !== user.id) {
		refuse(NOT_ITS_TAB.replace("{id}", id).replace("{app}", user.id));
	}
}

function idsOf(actions: readonly { readonly id: string }[]): string {
	return actions.map(({ id }) => id).join(",") || "none";
}
