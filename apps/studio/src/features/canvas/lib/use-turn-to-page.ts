import { useCommand } from "@widgetarium/data-framework";
import { fadedTurn } from "./faded-turn.js";
import { ShowPageCommand } from "@widgetarium/canvas";

export type TurnToPage = (from: Element | null, page: string) => void;

export function useTurnToPage(): TurnToPage {
	const showPage = useCommand(ShowPageCommand);
	return (from, page) => fadedTurn(from, () => void showPage.run({ page }));
}
