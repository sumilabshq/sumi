import type { Editor } from "../../shared/schema/chat-context.schema.js";

export abstract class EditorChoiceGateway {
	abstract chosen(): Editor | null;
	abstract choose(editor: Editor): void;
}
