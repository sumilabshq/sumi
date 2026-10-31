import { createElement as h } from "react";
import type { ClipboardEvent, DragEvent, ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";
import type { Door } from "@widgetarium/command-menu";
import { useSelectsFieldOnMount } from "../../lib/use-selects-field-on-mount.js";
import { FieldIcon } from "./field-icon.js";
import type { FieldGlyph } from "./field-icon.js";

export interface MenuFieldAsk {
	readonly door: Door;
	readonly text: string;
	readonly ghost: string;
	readonly onText: (text: string) => void;
	readonly onDoor: (door: Door) => void;
}

export interface MenuFieldProps {
	readonly ask: MenuFieldAsk;
	readonly end: ReactNode;
	readonly onFiles: FilesTaker | null;
}

type FilesTaker = (files: readonly File[]) => void;

const PLACEHOLDER: Readonly<Record<Door, string>> = {
	anywhere: "Find tabs, chats and apps",
	"new-tab": "Search the web or ask Sumi",
	ask: "Ask Sumi anything",
	"this-tab": "Address or search, opens in this tab",
};
const IN_THIS_TAB = "In this tab";
const SEARCH_EVERYTHING = "Remove, search everything";
const FIELD_LABEL = "Find tabs, chats, apps or make something new";
const FIELD_GLYPH_BY_DOOR: Readonly<Record<Door, FieldGlyph>> = {
	anywhere: "find",
	"new-tab": "new",
	ask: "ask",
	"this-tab": "find",
};

export function MenuField({ ask: { door, text, ghost, onText, onDoor }, end, onFiles }: MenuFieldProps): ReactElement {
	const field = useSelectsFieldOnMount();
	return (
		<div
			className="wg-cm-field"
			onDragOver={(event) => acceptFileDrag(event, onFiles)}
			onDrop={(event) => takeDroppedFiles(event, onFiles)}
		>
			<FieldIcon shown={FIELD_GLYPH_BY_DOOR[door]} />
			{door === "this-tab" ? (
				<span className="wg-cm-token">
					<Icon name="arrow-right-left" size={12} />
					{IN_THIS_TAB}
					<button
						type="button"
						className="wg-cm-token-drop"
						aria-label={SEARCH_EVERYTHING}
						onClick={() => {
							onDoor("anywhere");
							field.current?.focus();
						}}
					>
						<Icon name="x" size={10} />
					</button>
				</span>
			) : null}
			<span className="wg-cm-input-wrap">
				<span className="wg-cm-ghost" aria-hidden="true">
					<span className="wg-cm-ghost-typed">{text}</span>
					{ghost}
				</span>
				<input
					ref={field}
					className="wg-cm-input"
					value={text}
					placeholder={PLACEHOLDER[door]}
					aria-label={FIELD_LABEL}
					spellCheck={false}
					onChange={(event) => onText(event.currentTarget.value)}
					onPaste={(event) => takePastedFiles(event, onFiles)}
				/>
			</span>
			{end}
		</div>
	);
}

function takePastedFiles(event: ClipboardEvent<HTMLInputElement>, onFiles: FilesTaker | null): void {
	const files = [...event.clipboardData.files];

	if (onFiles === null || files.length === 0) {
		return;
	}

	event.preventDefault();
	onFiles(files);
}

function acceptFileDrag(event: DragEvent<HTMLDivElement>, onFiles: FilesTaker | null): void {
	if (onFiles === null || !event.dataTransfer.types.includes("Files")) {
		return;
	}

	event.preventDefault();
}

function takeDroppedFiles(event: DragEvent<HTMLDivElement>, onFiles: FilesTaker | null): void {
	const files = [...event.dataTransfer.files];

	if (onFiles === null || files.length === 0) {
		return;
	}

	event.preventDefault();
	onFiles(files);
}
