import { terminal } from "@sumi/contract";
import { AuthenticatedGuard, Device, module } from "@widgetarium/data-framework";

export const gitWork = module("git-work")
	.on(Device)
	.imports(terminal)
	.guard(AuthenticatedGuard)
	.provide(() => ({}));
