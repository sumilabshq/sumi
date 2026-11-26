import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { canvasesChanged } from "../../gateways/canvases/canvases.events.js";
import { boardsOnPage, missingPageReason, pageOf } from "../../shared/lib/canvas-edits.js";
import { GetChatViewAskSchema, KeepChatViewAskSchema } from "../../shared/schema/asks.schema.js";
import { ChatViewSchema } from "../../shared/schema/canvas.schema.js";
import type { Canvas, ChatView } from "../../shared/schema/canvas.schema.js";

export const getChatView = query()
	.public()
	.input(GetChatViewAskSchema)
	.output(ChatViewSchema.nullable())
	.handle(({ canvasId, view }, { canvases }) => canvases.canvas(canvasId).chatViews[view] ?? null);

export const keepChatView = command()
	.public()
	.input(KeepChatViewAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, view, chatView }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		const refusal = refusalOf(canvas, chatView);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const reason = `chat view ${view}: ${summaryOf(canvas.chatViews[view])} → ${summaryOf(chatView)}`;
		canvases.keepView(canvasId, { ...canvas, chatViews: { ...canvas.chatViews, [view]: chatView } }, reason);
		console.info(`[artboards] ${canvasId}: ${reason}`);
	});

export const rereadChatViews = subscriber(canvasesChanged).handle((_input, { invalidate }) => {
	invalidate(getChatView);
});

function refusalOf(canvas: Canvas, chatView: ChatView): string | null {
	const missingPage = [...chatView.pages, chatView.page].find((page) => pageOf(canvas, page) === null);

	if (missingPage !== undefined) {
		return missingPageReason(missingPage);
	}

	if (!chatView.pages.includes(chatView.page)) {
		return `page ${chatView.page} is not among the pages ${chatView.pages.join(", ")} the card offers`;
	}

	const onPage = boardsOnPage(canvas, chatView.page).map(({ id }) => id);
	const strayBoard = chatView.boards.find((board) => !onPage.includes(board));
	return strayBoard === undefined ? null : `artboard ${strayBoard} is not on page ${chatView.page}; list them with getBoards`;
}

function summaryOf(chatView: ChatView | undefined): string {
	if (chatView === undefined) {
		return "none";
	}

	const area = chatView.area === null ? "no area" : `area ${chatView.area.x},${chatView.area.y} ${chatView.area.w}×${chatView.area.h}`;
	return `pages ${chatView.pages.join(",")} · page ${chatView.page} · boards ${chatView.boards.join(",") || "none"} · ${area}`;
}
