import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Kbd } from "@widgetarium/kit";
import type { SlashMenu } from "../../lib/use-slash-menu.js";

const MENU_LABEL = "Commands";
const NO_MATCH = "No commands match “{typed}”";
const HINTS = [
	["Tab", "Insert"],
	["↵", "Run"],
	["↑↓", "Move"],
] as const;

export function SlashMenuPanel({ slash, draft }: { readonly slash: SlashMenu; readonly draft: string }): ReactElement {
	const isEmpty = slash.matches.length === 0;
	return (
		<div className="sumi-slash-menu" role="listbox" aria-label={MENU_LABEL}>
			<p className="sumi-slash-label">{MENU_LABEL}</p>
			{isEmpty ? <p className="sumi-slash-none">{NO_MATCH.replace("{typed}", draft)}</p> : null}
			{slash.matches.map((entry) => (
				<button
					key={entry.name}
					type="button"
					role="option"
					aria-selected={entry.name === slash.active?.name}
					className="sumi-slash-row"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => slash.run(entry)}
				>
					<span className="sumi-slash-name">/{entry.name}</span>
					<span className="sumi-slash-said">{entry.description}</span>
				</button>
			))}
			{isEmpty ? null : (
				<p className="sumi-slash-foot">
					{HINTS.map(([key, label]) => (
						<span key={label}>
							<Kbd>{key}</Kbd>
							{label}
						</span>
					))}
				</p>
			)}
		</div>
	);
}
