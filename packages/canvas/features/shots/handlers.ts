import { handler, refuse } from "@widgetarium/core/requests";
import { DesignDrawing } from "../../adapters/design-drawing/design-drawing.adapter.js";
import { DesignFolder } from "../../adapters/design-folder/design-folder.adapter.js";
import { boardIn } from "../../lib/design/board-in-note.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { shotPartsOf } from "../../lib/shots/shot-parts.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { NoteBoardQuery, ShotCountQuery, ShotPartQuery } from "./contract.js";

const NO_NOTE = "{note} is not a note here";
const NO_BOARD = "{note} holds no widgetarium board to draw";
const BOARD_REFUSED = "{note}: {why}";
const NO_PART = "the shot has no part {at}";

export const noteBoardHandler = handler(NoteBoardQuery, {
	inject: { designFolder: DesignFolder },
	run: async ({ note, width }, { designFolder }) => {
		const text = await designFolder.noteText(note);
		if (text === null) return refuse(NO_NOTE.replace("{note}", note));
		const read = boardIn(text);
		if (read.kind === "refused") return refuse(BOARD_REFUSED.replace("{note}", note).replace("{why}", read.refusal));
		if (read.kind === "none") return refuse(NO_BOARD.replace("{note}", note));
		return { board: read.board, width };
	},
});

export const shotCountHandler = handler(ShotCountQuery, {
	inject: { designReads: DesignReads, designDrawing: DesignDrawing, canvasStore: CanvasStore },
	run: async (asked, { designReads, designDrawing, canvasStore }) => {
		const { app } = canvasStore.now();
		const design = await designReads.design(app);
		return { count: shotPartsOf(design, { ...asked, app }, designDrawing.drawing()).length };
	},
});

export const shotPartHandler = handler(ShotPartQuery, {
	inject: { designReads: DesignReads, designDrawing: DesignDrawing, canvasStore: CanvasStore },
	run: async ({ at, ...asked }, { designReads, designDrawing, canvasStore }) => {
		const { app } = canvasStore.now();
		const design = await designReads.design(app);
		const region = shotPartsOf(design, { ...asked, app }, designDrawing.drawing())[at];
		if (!region) return refuse(NO_PART.replace("{at}", String(at)));
		return { region };
	},
});
