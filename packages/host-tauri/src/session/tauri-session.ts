import { z } from "zod";
import { KeptColumnSchema, KeptTabsSchema } from "@widgetarium/app-host";
import type { KeptColumn } from "@widgetarium/app-host";
import { TabsColumnGateway, TabsSessionGateway } from "@widgetarium/app-host/gateways";
import { HeldDoc } from "../store/held-doc.js";
import { workspaceRootOf } from "../store/store-client.js";
import type { DocKind, StoreClient } from "../store/store-client.js";

type HostTabsMoment = NonNullable<ReturnType<TabsSessionGateway["kept"]>>;

const SessionSchema = z.looseObject({
	tabs: KeptTabsSchema.nullable().catch(null),
	column: KeptColumnSchema.nullable().catch(null),
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

export class TauriTabsSessionGateway extends TabsSessionGateway {
	constructor(private readonly session: HeldSession) {
		super();
	}

	kept(): HostTabsMoment | null {
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
		this.session.change({ column }, `column ${column.isShown ? "shown" : "hidden"}`);
	}
}
