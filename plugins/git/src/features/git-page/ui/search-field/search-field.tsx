import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Glyph } from "../glyph/glyph.js";

export interface SearchFieldProps {
	readonly value: string;
	readonly placeholder: string;
	readonly isFocused: boolean;
	onChange(value: string): void;
}

export function SearchField({ value, placeholder, isFocused, onChange }: SearchFieldProps): ReactElement {
	return (
		<label className="wg-git-field">
			<Glyph name="search" />
			<input
				autoFocus={isFocused}
				autoComplete="off"
				autoCorrect="off"
				autoCapitalize="off"
				spellCheck={false}
				value={value}
				placeholder={placeholder}
				aria-label={placeholder}
				onChange={(event) => onChange(event.target.value)}
			/>
		</label>
	);
}
