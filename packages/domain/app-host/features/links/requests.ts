import { Repeatable, command, refuse } from "@widgetarium/core/requests";
import { linkTargetOf } from "@widgetarium/core/engine/sumi-link.js";
import type { LinkKind } from "@widgetarium/core/engine/sumi-link.js";
import { TabsSettledEvent } from "../../shared/events/tabs.events.js";
import { SHOWING_PARTS } from "../../shared/lib/tab-showing/showing-parts.js";
import { openTabSettled, showChatSettled, showTabSettled } from "../../shared/lib/tab-showing/tab-opening.js";
import type { TabsReach } from "../../shared/lib/tab-showing/tab-settling.js";
import { AppKindSchema } from "../../shared/schema/app-tab.schema.js";
import type { AppKind } from "../../shared/schema/app-tab.schema.js";
import { LinkToOpenSchema } from "../../shared/schema/link.schema.js";

interface LinkOpening {
	readonly id: string;
	readonly opensNew: boolean;
	readonly reach: TabsReach;
}

type LinkOpener = (opening: LinkOpening) => Promise<string | null>;

const TASKS_APP: AppKind = "tasks";
const NO_SUCH_APP = "Sumi has no app named {app}";
const OPENED = "[widgetarium] link {href} opened{where}";

const LINK_OPENERS: Readonly<Record<LinkKind, LinkOpener>> = {
	chat: openChatLinked,
	task: openTaskLinked,
	tab: showTabLinked,
	app: openAppLinked,
};

export const OpenLinkCommand = command("open-link")
	.input(LinkToOpenSchema)
	.idempotencyKey(Repeatable)
	.inject(SHOWING_PARTS)
	.emits(TabsSettledEvent)
	.handle(async ({ href, opensNew }, { send, emit, ...parts }) => {
		const read = linkTargetOf(href);
		const reach = { parts, send, told: () => emit(TabsSettledEvent) };
		const refusal = read.ok
			? await LINK_OPENERS[read.target.kind]({ id: read.target.id, opensNew, reach })
			: read.reason;

		if (refusal !== null) {
			return refuse(refusal);
		}

		console.info(OPENED.replace("{href}", href).replace("{where}", opensNew ? " in a new tab" : ""));
	});

async function openChatLinked({ id, reach }: LinkOpening): Promise<null> {
	await showChatSettled(reach, { chatId: id, paneId: null });
	return null;
}

async function openTaskLinked({ id, opensNew, reach }: LinkOpening): Promise<null> {
	await openAppTab(reach, { app: TASKS_APP, address: id, opensNew });
	return null;
}

async function showTabLinked({ id, reach }: LinkOpening): Promise<null> {
	await showTabSettled(reach, id);
	return null;
}

async function openAppLinked({ id, opensNew, reach }: LinkOpening): Promise<string | null> {
	const app = AppKindSchema.safeParse(id);

	if (!app.success) {
		return NO_SUCH_APP.replace("{app}", id);
	}

	await openAppTab(reach, { app: app.data, address: "", opensNew });
	return null;
}

interface AppTabAsk {
	readonly app: AppKind;
	readonly address: string;
	readonly opensNew: boolean;
}

async function openAppTab(reach: TabsReach, { app, address, opensNew }: AppTabAsk): Promise<void> {
	await openTabSettled(reach, {
		app,
		list: null,
		groupId: null,
		address,
		show: true,
		reusesHeld: !opensNew,
	});
}
