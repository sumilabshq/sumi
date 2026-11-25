import { terminal } from "@sumi/contract";
import { Device, module } from "@widgetarium/data-framework";
import { LocalStorageEditorChoiceGateway } from "./gateways/editor-choice/local-storage.gateway.js";
import { MemoryEditorChoiceGateway } from "./gateways/editor-choice/memory.gateway.js";

export const chatContext = module("chat-context")
	.on(Device)
	.imports(terminal)
	.provide(() => ({
		editorChoice:
			typeof localStorage === "undefined"
				? new MemoryEditorChoiceGateway()
				: new LocalStorageEditorChoiceGateway(localStorage),
	}));
