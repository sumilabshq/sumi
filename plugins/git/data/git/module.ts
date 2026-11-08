import { FileSystemModule, TerminalModule } from "@sumi/contract";
import { Device, module } from "@widgetarium/data-framework";
import { MemoryGitLookGateway } from "./gateways/git-look/memory.gateway.js";
import { handled } from "./generated/handled.js";

export const GitModule = module("git")
	.on(Device)
	.imports(TerminalModule, FileSystemModule)
	.provide(() => ({ gitLook: new MemoryGitLookGateway() }))
	.handles(...handled);
