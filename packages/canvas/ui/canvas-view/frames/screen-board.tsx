import { createElement as h, useRef } from "react";
import type { ReactElement } from "react";
import { useStaticBoardIn } from "../hooks/frames/use-static-board-in.js";
import type { StaticBoard } from "../hooks/frames/use-static-board-in.js";

export function ScreenBoard(drawn: StaticBoard): ReactElement {
	const node = useRef<HTMLDivElement | null>(null);
	useStaticBoardIn(node, drawn);
	return <div ref={node} className="wg-mount" />;
}
