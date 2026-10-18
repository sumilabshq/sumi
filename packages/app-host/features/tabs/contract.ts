import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { AppKindSchema, AppTabsSchema } from "../../shared/schema/app-tab.schema.js";

const TabSchema = z.object({ id: z.string() });

export const AppTabsQuery = query("app-host/app-tabs").output(AppTabsSchema).settlesNow();

export const ShowTabCommand = command("app-host/show-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const OpenTabCommand = command("app-host/open-tab")
	.input(z.object({ app: AppKindSchema }))
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const CloseTabCommand = command("app-host/close-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const CloseShownTabCommand = command("app-host/close-shown-tab")
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const MoveTabCommand = command("app-host/move-tab")
	.input(TabSchema.extend({ before: z.string().nullable(), isPinned: z.boolean() }))
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const PinTabCommand = command("app-host/pin-tab")
	.input(TabSchema.extend({ isPinned: z.boolean() }))
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const OpenTabBelowCommand = command("app-host/open-tab-below")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const DuplicateTabCommand = command("app-host/duplicate-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const ReloadTabCommand = command("app-host/reload-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const RenameTabCommand = command("app-host/rename-tab")
	.input(TabSchema.extend({ label: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const CloseOtherTabsCommand = command("app-host/close-other-tabs")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);

export const ReopenClosedTabCommand = command("app-host/reopen-closed-tab")
	.idempotencyKey(Repeatable)
	.invalidates([AppTabsQuery]);
