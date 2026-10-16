import { handlerOf } from "@widgetarium/core/mediator";
import type { InputOf, ReturnedOf } from "@widgetarium/core/mediator";
import { DesignSource } from "../../adapters/design-source/design-source.adapter.js";
import { NoteBoardQuery } from "../../requests/note-board.query.js";

const NO_BOARD = "{note} holds no widgetarium board to draw";

export class NoteBoardQueryHandler extends handlerOf(NoteBoardQuery) {
	private readonly designSource = this.inject(DesignSource);

	override async handle({ note, width }: InputOf<typeof NoteBoardQuery>): Promise<ReturnedOf<typeof NoteBoardQuery>> {
		const board = await this.designSource.noteBoard(note);
		if (!board) throw new Error(NO_BOARD.replace("{note}", note));
		return { board, width };
	}
}
