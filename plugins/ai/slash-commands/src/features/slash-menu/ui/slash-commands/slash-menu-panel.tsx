import { createElement as h, useLayoutEffect, useRef } from "react";
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
}

export function SlashMenuPanel({ slash, draft, isLeaving, onGone }: SlashMenuPanelProps): ReactElement {
	const isEmpty = slash.matches.length === 0;
	const panel = useRef<HTMLDivElement>(null);
	useResizesSmoothly(panel, isLeaving, onGone);
	useLayoutEffect(() => {
		const node = panel.current;
		const frame = node?.offsetParent;
		const field = frame?.parentElement;

		if (!node || !(frame instanceof HTMLElement) || !field) {
			return undefined;
		}

		const lift = (): void =>
			node.style.setProperty(
				"--sumi-slash-lift",
				`${frame.getBoundingClientRect().top - field.getBoundingClientRect().top}px`,
			);
		lift();

		if (typeof ResizeObserver !== "function") {
			return undefined;
		}

		const sizes = new ResizeObserver(lift);
		sizes.observe(field);
		return () => sizes.disconnect();
	}, []);
	return (
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
		</div>
	);
}
