import { z } from "zod";
import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import { BrowserTabsSchema } from "../../shared/schema/browser-tab.schema.js";

const TabSchema = z.object({ tabId: z.string() });
const ElementSchema = z.custom<HTMLElement>(
	(value) => typeof value === "object" && value !== null && "append" in value && "isConnected" in value,
);

export const BrowserTabsQuery = query("browser/browser-tabs").output(BrowserTabsSchema).settlesNow();

export const OpenAddressCommand = command("browser/open-address")
	.input(TabSchema.extend({ address: z.string().trim().min(1) }))
	.idempotencyKey(PerCall)
	.invalidates([BrowserTabsQuery]);

export const ShowTabCommand = command("browser/show-tab")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);

export const OpenPageCommand = command("browser/open-page")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);

export const ClosePageCommand = command("browser/close-page")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);

export const GoBackCommand = command("browser/go-back")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);

export const GoForwardCommand = command("browser/go-forward")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);

export const ReloadPageCommand = command("browser/reload-page")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);

export const AskInkCommand = command("browser/ask-ink").input(TabSchema).idempotencyKey(PerCall);

export const LeaveFailureCommand = command("browser/leave-failure")
	.input(TabSchema)
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);

export const AttachPagesCommand = command("browser/attach-pages")
	.input(z.object({ into: ElementSchema }))
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);

export const DetachPagesCommand = command("browser/detach-pages")
	.input(z.object({ from: ElementSchema }))
	.idempotencyKey(Repeatable)
	.invalidates([BrowserTabsQuery]);
