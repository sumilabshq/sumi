import { fileSystem, terminal } from "@sumi/contract";
import { Device, module } from "@widgetarium/data-framework";
import { MemoryGitLookGateway } from "./gateways/git-look/memory.gateway.js";
import { handled } from "./generated/handled.js";

export const git = module()
	.on(Device)
	.imports(terminal, fileSystem)
	.provide(() => ({ gitLook: new MemoryGitLookGateway() }))
	.handles(handled);
