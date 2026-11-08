import { useCommand } from "@widgetarium/data-framework";
import { fadedTurn } from "./faded-turn.js";
import { canvas } from "@widgetarium/canvas/contract";

export type TurnToPage = (from: Element | null, page: string) => void;

export function useTurnToPage(): TurnToPage {
	const showPage = useCommand(canvas.pages.showPage);
	return (from, page) => fadedTurn(from, () => void showPage.run({ page }));
}
