import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface SearchFieldProps {
	readonly words: string;
	readonly onWords: (words: string) => void;
}

const ICON_PX = 14;
const SAID = "Search canvases";

export function SearchField({ words, onWords }: SearchFieldProps): ReactElement {
	return (
		<label className="sumi-canvas-search">
			<Icon name="search" size={ICON_PX} />
			<input
				className="sumi-canvas-search-field"
				type="search"
				placeholder={SAID}
				aria-label={SAID}
				value={words}
				onChange={(event) => onWords(event.currentTarget.value)}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						onWords("");
					}
				}}
			/>
		</label>
	);
}
