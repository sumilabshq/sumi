import type { Editor } from "../../shared/schema/chat-context.schema.js";
import { EditorChoiceGateway } from "./editor-choice.gateway.js";

export class MemoryEditorChoiceGateway extends EditorChoiceGateway {
	private editor: Editor | null = null;

	chosen(): Editor | null {
		return this.editor;
	}

	choose(editor: Editor): void {
		this.editor = editor;
	}
}
