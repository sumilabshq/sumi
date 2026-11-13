export type EditedText =
	| {
			readonly text: string;
			readonly replaced: number;
	  }
	| {
			readonly refusal: string;
	  };

export interface TextEdit {
	readonly oldText: string;
	readonly newText: string;
	readonly replaceAll: boolean;
}

const NOT_FOUND = "oldText is not in {path}: read the file again and copy the text exactly";
const NOT_UNIQUE = "oldText occurs {count} times in {path}: give more context around it, or set replaceAll";

export function editedTextOf(path: string, text: string, { oldText, newText, replaceAll }: TextEdit): EditedText {
	const count = text.split(oldText).length - 1;

	if (count === 0) {
		return { refusal: NOT_FOUND.replace("{path}", path) };
	}

	if (count > 1 && !replaceAll) {
		return { refusal: NOT_UNIQUE.replace("{count}", String(count)).replace("{path}", path) };
	}

	return {
		text: replaceAll ? text.split(oldText).join(newText) : text.replace(oldText, () => newText),
		replaced: replaceAll ? count : 1,
	};
}
