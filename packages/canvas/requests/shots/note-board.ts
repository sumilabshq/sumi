import { z } from "zod";
import { handlerOf, inject, query } from "@widgetarium/core/mediator";
import type { InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../ports/design-source.port.js";
import { BoardSchema } from "../../schema/design.js";

export const NoteBoardQuery = query("canvas/note-board")
	.input(z.object({ note: z.string(), width: z.number() }))
	.output(z.object({ board: BoardSchema, width: z.number() }));

const NO_BOARD = "{note} holds no widgetarium board to draw";

export class NoteBoardQueryHandler extends handlerOf(NoteBoardQuery) {
	private readonly designSource = inject(DesignSource);

	override async handle({ note, width }: InputOf<typeof NoteBoardQuery>): Promise<ReturnedOf<typeof NoteBoardQuery>> {
		const board = await this.designSource.noteBoard(note);
		if (!board) throw new Error(NO_BOARD.replace("{note}", note));
		return { board, width };
	}
}
