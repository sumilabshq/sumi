import { fileSystem, places } from "@sumi/contract";
import { Device, module } from "@widgetarium/data-framework";
import { filePagePartsOn } from "./gateways/file-page-parts/file-page-parts.gateway.js";
import type { FilePageConfig } from "./shared/host/file-page.host.js";
import { handled } from "./generated/handled.js";

export type { FilePageConfig } from "./shared/host/file-page.host.js";

export const filePage = module()
	.on(Device)
	.imports(fileSystem, places)
	.config<FilePageConfig>()
	.provide((facts) => filePagePartsOn(facts))
	.handles(handled);
