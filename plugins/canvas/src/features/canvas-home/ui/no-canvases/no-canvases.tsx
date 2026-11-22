import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NewCanvasButton } from "../new-canvas-button/new-canvas-button.js";

export interface NoCanvasesProps {
	readonly tabId: string;
	readonly words: string;
}

export function NoCanvases({ tabId, words }: NoCanvasesProps): ReactElement {
	if (words.trim() !== "") {
		return <p className="sumi-canvas-home-none">{`No canvas is named “${words.trim()}”.`}</p>;
	}

	return (
		<div className="sumi-canvas-home-empty">
			<h2>No canvases yet</h2>
			<p>
				A canvas holds screens as artboards. Start one here, or ask Sumi in a chat to draw: its canvas shows up on this
				page.
			</p>
			<NewCanvasButton tabId={tabId} />
		</div>
	);
}
