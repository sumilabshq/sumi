import { EditorSchema } from "../../shared/schema/chat-context.schema.js";
import type { Editor } from "../../shared/schema/chat-context.schema.js";
import { EditorChoiceGateway } from "./editor-choice.gateway.js";

const KEY = "sumi.chat-context.editor";

export class LocalStorageEditorChoiceGateway extends EditorChoiceGateway {
	constructor(private readonly storage: Pick<Storage, "getItem" | "setItem">) {
		super();
	}

	chosen(): Editor | null {
		return EditorSchema.safeParse(this.storage.getItem(KEY)).data ?? null;
	}

	choose(editor: Editor): void {
		this.storage.setItem(KEY, editor);
	}
}
