import { createElement as h, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useIsSeen } from "../hooks/frames/use-is-seen.js";
import { useMountedInTurn } from "../hooks/frames/use-mounted-in-turn.js";
import { DRAWS_AT_ONCE } from "../../state-drawing/draw-contexts.js";
import { FRAME_PICTURES } from "../field-contexts.js";

export interface DrawnWhenSeenProps {
	readonly minHeight: number;
	readonly frame: string;
	readonly pictureKey: string;
	readonly children?: ReactNode;
}

export function DrawnWhenSeen({ minHeight, frame, pictureKey, children }: DrawnWhenSeenProps): ReactElement {
	const [node, setNode] = useState<HTMLDivElement | null>(null);
	const [live, setLive] = useState<HTMLDivElement | null>(null);
	const isAtOnce = useContext(DRAWS_AT_ONCE);
	const pictures = useContext(FRAME_PICTURES);
	const isMounted = useMountedInTurn(useIsSeen(node)) || isAtOnce;
	const picture = pictures?.shown[frame];
	const isFresh = picture?.key === pictureKey;
	// TRADE-OFF: pictures at every zoom; seventeen live frames froze Obsidian, a sharp close-up costs too much
	const isPicture = picture !== undefined && !isAtOnce;
	const asked = isMounted && !isAtOnce && !isFresh ? live : null;
	useEffect(() => {
		if (asked && pictures) pictures.ask({ frame, key: pictureKey, node: asked });
	}, [asked, frame, pictureKey, pictures]);
	const isLiveDrawn = isMounted && !(isPicture && isFresh);
	return (
		<div ref={setNode} className="wg-design-seen cv:relative" style={isMounted ? undefined : { minHeight }}>
			{isPicture ? (
				<img
					className="cv:block cv:h-auto cv:w-full cv:max-w-none"
					src={picture.url}
					alt=""
					draggable={false}
					data-canvas-picture=""
				/>
			) : null}
			{isLiveDrawn ? (
				<div
					ref={setLive}
					className={
						isPicture ? "cv:pointer-events-none cv:absolute cv:top-0 cv:left-0 cv:w-full cv:opacity-0" : undefined
					}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}
