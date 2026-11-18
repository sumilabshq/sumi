import { createElement as h } from "react";
import type { ReactElement } from "react";
import { CANVAS_ICON_SOURCE } from "../../../../shared/lib/canvas-icon.js";

export interface MiniHeadPage {
	readonly id: string;
	readonly name: string;
}

export interface MiniHeadProps {
	readonly title: string;
	readonly pages: readonly MiniHeadPage[];
	readonly page: string;
	readonly href: string;
	onPick(page: string): void;
}

const OPEN_LABEL = "Open the canvas";

export function MiniHead({ title, pages, page, href, onPick }: MiniHeadProps): ReactElement {
	return (
		<div className="sumi-mcp-head is-over">
			<div className="sumi-mcp-tag" data-mini-canvas-head="">
				<img className="sumi-mcp-tag-glyph" src={CANVAS_ICON_SOURCE} alt="" />
				<span className="sumi-mcp-tag-title">{title}</span>
				{pages.length > 1 ? (
					<span className="sumi-mini-canvas-pages">
						{pages.map(({ id, name }) => (
							<button
								key={id}
								type="button"
								className={id === page ? "sumi-mini-canvas-page is-shown" : "sumi-mini-canvas-page"}
								onClick={() => onPick(id)}
							>
								{name}
							</button>
						))}
					</span>
				) : null}
			</div>
			<a className="sumi-mcp-square" href={href} aria-label={OPEN_LABEL} title={OPEN_LABEL} data-mini-canvas-head="">
				<svg viewBox="0 0 12 12" aria-hidden="true">
					<path d="M4 2h6v6M10 2L3 9" />
				</svg>
			</a>
		</div>
	);
}
