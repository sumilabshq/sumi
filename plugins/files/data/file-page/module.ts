import { FileSystemModule, PlacesModule } from "@sumi/contract";
import { Device, module } from "@widgetarium/data-framework";
import { filePagePartsOn } from "./gateways/file-page-parts/file-page-parts.gateway.js";
import type { FilePageConfig } from "./shared/host/file-page.host.js";
import { handled } from "./generated/handled.js";

export type { FilePageConfig } from "./shared/host/file-page.host.js";

export const FilePageModule = module("file-page")
	.on(Device)
	.imports(FileSystemModule, PlacesModule)
	.config<FilePageConfig>()
	.provide((facts) => filePagePartsOn(facts))
	.handles(...handled);
