import { createElement as h, useContext, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useOptionalQuery } from "@widgetarium/core/mediator";
import { FramePictureQuery } from "../../../requests/frame-picture.query.js";
import { DRAWS_AT_ONCE } from "../../../lib/state-drawing/draw-contexts.js";
import { useAsksForPicture } from "../../../lib/field/frames/use-asks-for-picture.js";
import { useIsSeen } from "../../../lib/field/frames/use-is-seen.js";
import { useMountedInTurn } from "../../../lib/field/frames/use-mounted-in-turn.js";

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
	const picture = useOptionalQuery(FramePictureQuery, { frame, key: pictureKey, isAtOnce }).data ?? NOT_PICTURED;
	const isMounted = useMountedInTurn(useIsSeen(node)) || isAtOnce;
	useAsksForPicture({ node: isMounted ? live : null, frame, pictureKey, isAsked: picture.isAsked });
	const isLiveDrawn = isMounted && !picture.isLiveHidden;
	return (
		<div ref={setNode} className="wg-design-seen cv:relative" style={isMounted ? undefined : { minHeight }}>
			{picture.url ? (
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
						picture.url ? "cv:pointer-events-none cv:absolute cv:top-0 cv:left-0 cv:w-full cv:opacity-0" : undefined
					}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}

const NOT_PICTURED = { url: null, isLiveHidden: false, isAsked: false } as const;
