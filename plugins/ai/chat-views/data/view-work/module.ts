import { fileSystem, terminal } from "@sumi/contract";
import { AuthenticatedGuard, Device, module } from "@widgetarium/data-framework";
import type { ViewWorkConfig } from "./shared/host/view-parts.host.js";

export type { ViewPart, ViewTemplate, ViewWorkConfig } from "./shared/host/view-parts.host.js";

export const viewWork = module("view-work")
	.on(Device)
	.imports(fileSystem, terminal)
	.config<ViewWorkConfig>()
	.guard(AuthenticatedGuard)
	.provide(({ config }) => ({
		parts: config.parts,
		templates: config.templates,
	}));
