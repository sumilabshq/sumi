import { createElement as h } from "react";
import type { ClipboardEvent, DragEvent, ReactElement, ReactNode } from "react";
import { useSelectsFieldOnMount } from "../../lib/use-selects-field-on-mount.js";

export interface MenuFieldAsk {
	readonly placeholder: string;
	readonly text: string;
	readonly ghost: string;
	readonly isLink: boolean;
	readonly onText: (text: string) => void;
}

export interface MenuFieldProps {
	readonly ask: MenuFieldAsk;
	readonly start: ReactNode;
	readonly end: ReactNode;
	readonly onFiles: FilesTaker | null;
}

type FilesTaker = (files: readonly File[]) => void;

const FIELD_LABEL = "Find tabs, chats, apps or make something new";

export function MenuField({
	ask: { placeholder, text, ghost, isLink, onText },
	start,
	end,
	onFiles,
}: MenuFieldProps): ReactElement {
	const field = useSelectsFieldOnMount();
	return (
		<div
			className="wg-cm-field"
			data-cm-link={isLink ? "" : undefined}
			onDragOver={(event) => acceptFileDrag(event, onFiles)}
			onDrop={(event) => takeDroppedFiles(event, onFiles)}
		>
			{start}
			<span className="wg-cm-input-wrap">
				<span className="wg-cm-ghost" aria-hidden="true">
					<span className="wg-cm-ghost-typed">{text}</span>
					{ghost}
				</span>
				<input
					ref={field}
					className="wg-cm-input"
					value={text}
					placeholder={placeholder}
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
