import { z } from "zod";
import { KeptColumnSchema, KeptTabsSchema } from "@widgetarium/app-host";
import type { KeptColumn, KeptTabs } from "@widgetarium/app-host";
import { TabsColumnGateway, TabsSessionGateway } from "@widgetarium/app-host/gateways";
import type { JsonMemory } from "@widgetarium/behaviors";
import { PaneTreeSchema } from "@widgetarium/layout";
import type { PaneTree } from "@widgetarium/layout";
import { HeldDoc } from "../store/held-doc.js";
import { workspaceRootOf } from "../store/store-client.js";
import type { DocKind, StoreClient } from "../store/store-client.js";

type HostTabsMoment = Parameters<TabsSessionGateway["keep"]>[0];

const PANES_REFUSED = "[widgetarium] kept panes refused, so the board starts from the first panes";

const SessionSchema = z.looseObject({
	tabs: KeptTabsSchema.nullable().catch(null),
	column: KeptColumnSchema.nullable().catch(null),
	panes: PaneTreeSchema.nullable()
		.default(null)
		.catch(({ error }) => {
			console.warn(PANES_REFUSED, error.issues);
			return null;
		}),
});

type Session = z.infer<typeof SessionSchema>;

const SESSION: DocKind<Session> = {
	file: "session.json",
	v: 1,
	schema: SessionSchema,
};

export type HeldSession = HeldDoc<Session>;

export function readSession(store: StoreClient, workspaceId: string): Promise<HeldSession> {
	return HeldDoc.read({
		store,
		root: workspaceRootOf(workspaceId),
		kind: SESSION,
		empty: SessionSchema.parse({}),
	});
}

export function sessionPanesMemory(session: HeldSession): JsonMemory<PaneTree> {
	return {
		read: () => session.now().panes,
		write: (panes, reason) =>
			session.change(
				{
					panes,
				},
				`panes ${reason}`,
			),
	};
}

export class TauriTabsSessionGateway extends TabsSessionGateway {
	constructor(private readonly session: HeldSession) {
		super();
	}

	kept(): KeptTabs | null {
		const tabs = this.session.now().tabs;
		if (tabs === null) {
			return null;
		}

		return {
			...tabs,
			tabs: tabs.tabs.map((tab) => ({
				...tab,
				pageId: null,
			})),
		};
	}

	keep(tabs: HostTabsMoment): void {
		this.session.change(
			{
				tabs: KeptTabsSchema.parse(tabs),
			},
			`tabs ${tabs.tabs.length}, shown ${tabs.shownId ?? "none"}`,
		);
	}
}

export class TauriTabsColumnGateway extends TabsColumnGateway {
	constructor(private readonly session: HeldSession) {
		super();
	}

	kept(): KeptColumn | null {
		return this.session.now().column;
	}

	keep(column: KeptColumn): void {
		this.session.change(
			{ column: KeptColumnSchema.parse(column) },
			`column ${column.fullPx}px, folded lists [${column.shutLists.join(", ")}]`,
		);
	}
}
