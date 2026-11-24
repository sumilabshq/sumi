import { createElement as h, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactElement } from "react";
import { Kbd, Pressable } from "@widgetarium/kit";
import type { SlashMenu } from "../../lib/use-slash-menu.js";
import { useResizesSmoothly } from "../../lib/use-resizes-smoothly.js";

const MENU_LABEL = "Commands";
const NO_MATCH = "No commands match “{typed}”";
const HINTS = [
	["Tab", "Insert"],
	["↵", "Run"],
	["↑↓", "Move"],
] as const;

export interface SlashMenuPanelProps {
	readonly slash: SlashMenu;
	readonly draft: string;
	readonly isLeaving: boolean;
	readonly onGone: () => void;
	readonly host: HTMLElement | null;
}

export function SlashMenuPanel({ slash, draft, isLeaving, onGone, host }: SlashMenuPanelProps): ReactElement | null {
	const isEmpty = slash.matches.length === 0;
	const panel = useRef<HTMLDivElement>(null);
	useResizesSmoothly(panel, isLeaving, onGone);
	if (host === null) {
		return null;
	}

	return createPortal(
		<div ref={panel} className="sumi-slash-menu" role="listbox" aria-label={MENU_LABEL} aria-hidden={isLeaving}>
			<p className="sumi-slash-label">{MENU_LABEL}</p>
			{isEmpty ? <p className="sumi-slash-none">{NO_MATCH.replace("{typed}", draft)}</p> : null}
			{slash.matches.map((entry) => (
				<Pressable
					key={entry.name}
					role="option"
					aria-selected={entry.name === slash.active?.name}
					className="sumi-slash-row"
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => slash.run(entry)}
				>
					<span className="sumi-slash-name">/{entry.name}</span>
					<span className="sumi-slash-said">{entry.description}</span>
				</Pressable>
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
		</div>,
		host,
	);
}
