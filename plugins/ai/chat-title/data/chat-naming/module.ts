import { AuthenticatedGuard, Anywhere, module } from "@widgetarium/data-framework";
import { workspaces } from "@widgetarium/workspaces/contract";

export const chatNaming = module("chat-naming")
	.on(Anywhere)
	.imports(workspaces)
	.guard(AuthenticatedGuard)
	.provide(() => ({}));
