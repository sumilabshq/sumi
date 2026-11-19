import { createElement as h, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { renamedTitleOf } from "../../lib/renamed-title.js";

const CHAT_NAME = "Chat name";

export interface TitleFieldProps {
	readonly title: string;
	onDone(renamed: string | null): void;
}

export function TitleField({ title, onDone }: TitleFieldProps): ReactElement {
	const [draft, setDraft] = useState(title);
	const field = useRef<HTMLInputElement>(null);
	const isDone = useRef(false);
	const finish = (renamed: string | null): void => {
		if (isDone.current) {
			return;
		}

		isDone.current = true;
		onDone(renamed);
	};

	useLayoutEffect(() => {
		field.current?.focus();
		field.current?.select();
	}, []);

	return (
		<span className="sumi-head-title is-renaming" data-draft={draft}>
			<input
				ref={field}
				className="sumi-head-title-field"
				aria-label={CHAT_NAME}
				value={draft}
				size={1}
				spellCheck={false}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => finish(renamedTitleOf(draft, title))}
				onKeyDown={(event) => {
					if (event.nativeEvent.isComposing) {
						return;
					}

					if (event.key === "Enter") {
						event.preventDefault();
						finish(renamedTitleOf(draft, title));
						return;
					}

					if (event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();
						finish(null);
					}
				}}
			/>
		</span>
	);
}
