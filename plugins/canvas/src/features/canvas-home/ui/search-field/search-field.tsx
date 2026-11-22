import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { Icon, Input } from "@widgetarium/kit";

export interface SearchFieldProps {
	readonly words: string;
	readonly onWords: (words: string) => void;
}

const ICON_PX = 14;
const SAID = "Search canvases";
const KEYS = "⌘F";

export function SearchField({ words, onWords }: SearchFieldProps): ReactElement {
	const field = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const focusOnKeys = (event: KeyboardEvent): void => {
			const shown = field.current;
			const isAsked = event.metaKey && event.key.toLowerCase() === "f";

			if (!isAsked || shown === null || shown.offsetParent === null) {
				return;
			}

			event.preventDefault();
			shown.focus();
			shown.select();
		};
		window.addEventListener("keydown", focusOnKeys);
		return () => window.removeEventListener("keydown", focusOnKeys);
	}, []);

	return (
		<div className="sumi-canvas-search">
			<Icon name="search" size={ICON_PX} />
			<Input
				variant="bare"
				block
				ref={field}
				className="sumi-canvas-search-field"
				type="search"
				placeholder={SAID}
				aria-label={SAID}
				aria-keyshortcuts="Meta+F"
				value={words}
				onChange={(event) => onWords(event.currentTarget.value)}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						onWords("");
					}
				}}
			/>
			<kbd className="sumi-canvas-search-keys">{KEYS}</kbd>
		</div>
	);
}
