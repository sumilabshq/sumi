import { FileSystemModule, TerminalModule } from "@sumi/contract";
import { Device, module } from "@widgetarium/data-framework";
import { handled } from "./generated/handled.js";

export const GitModule = module("git")
	.on(Device)
	.imports(TerminalModule, FileSystemModule)
	.provide(() => ({}))
	.handles(...handled);
