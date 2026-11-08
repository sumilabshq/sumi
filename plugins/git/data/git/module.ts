import { fileSystem, terminal } from "@sumi/contract";
import { Device, module } from "@widgetarium/data-framework";
import { MemoryGitLookGateway } from "./gateways/git-look/memory.gateway.js";

export const git = module("git")
	.on(Device)
	.imports(terminal, fileSystem)
	.provide(() => ({ gitLook: new MemoryGitLookGateway() }));
