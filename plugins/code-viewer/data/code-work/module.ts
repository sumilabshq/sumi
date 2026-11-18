import { fileSystem } from "@sumi/contract";
import { AuthenticatedGuard, Device, module } from "@widgetarium/data-framework";

export const codeWork = module("code-work")
	.on(Device)
	.imports(fileSystem)
	.guard(AuthenticatedGuard)
	.provide(() => ({}));
