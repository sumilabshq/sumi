import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { AppKindSchema, AppTabsSchema, TabsSidebarSchema } from "../../shared/schema/app-tab.schema.js";
import { TabDropSchema } from "../../shared/schema/tab-drop.schema.js";

const TabSchema = z.object({ id: z.string() });

export const AppTabsQuery = query("app-host/app-tabs").output(AppTabsSchema).settlesNow();

export const TabsSidebarQuery = query("app-host/tabs-sidebar").output(TabsSidebarSchema).settlesNow();

export const CanOpenOwnWindowQuery = query("app-host/can-open-own-window").output(z.boolean()).settlesNow();

const SHOWN = [AppTabsQuery, TabsSidebarQuery] as const;

export const ShowTabCommand = command("app-host/show-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const OpenTabCommand = command("app-host/open-tab")
	.input(z.object({ app: AppKindSchema }))
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const CloseTabCommand = command("app-host/close-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const CloseShownTabCommand = command("app-host/close-shown-tab").idempotencyKey(Repeatable).invalidates(SHOWN);

export const PlaceTabCommand = command("app-host/place-tab")
	.input(TabSchema.extend({ to: TabDropSchema }))
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const MoveTabToListCommand = command("app-host/move-tab-to-list")
	.input(TabSchema.extend({ list: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const OpenTabBelowCommand = command("app-host/open-tab-below")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const DuplicateTabCommand = command("app-host/duplicate-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const ReloadTabCommand = command("app-host/reload-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const RenameTabCommand = command("app-host/rename-tab")
	.input(TabSchema.extend({ label: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const CloseOtherTabsCommand = command("app-host/close-other-tabs")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const ShowChatTabCommand = command("app-host/show-chat-tab").idempotencyKey(Repeatable).invalidates(SHOWN);

export const ReopenClosedTabCommand = command("app-host/reopen-closed-tab")
	.idempotencyKey(Repeatable)
	.invalidates(SHOWN);

export const TearOffTabCommand = command("app-host/tear-off-tab").input(TabSchema).idempotencyKey(Repeatable);
