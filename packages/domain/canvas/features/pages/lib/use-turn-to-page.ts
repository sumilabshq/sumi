import { useCommand } from "@widgetarium/core/requests";
import { fadedTurn } from "../../../shared/lib/pages/faded-turn.js";
import { ShowPageCommand } from "../contract.js";

export type TurnToPage = (from: Element | null, page: string) => void;

export function useTurnToPage(): TurnToPage {
	const showPage = useCommand(ShowPageCommand);
	return (from, page) => fadedTurn(from, () => void showPage.run({ page }));
}
