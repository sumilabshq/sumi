import { createElement as h, useState } from "react";
import type { ReactNode } from "react";
import { PopoverSearch } from "@widgetarium/kit";
import { SessionRows } from "../session-rows/session-rows.js";

const SEARCH = "Search sessions";
const SEARCH_ARCHIVED = "Search archived sessions";

export interface SessionsListProps {
	readonly currentChatId: string | null;
	onClose(): void;
}

export function SessionsList({ currentChatId, onClose }: SessionsListProps): ReactNode {
	const [isArchived, setArchived] = useState(false);
	return (
		<PopoverSearch placeholder={isArchived ? SEARCH_ARCHIVED : SEARCH}>
			{(needle) => (
				<SessionRows
					key={`${String(isArchived)}:${needle}`}
					needle={needle}
					isArchived={isArchived}
					currentChatId={currentChatId}
					onArchivedShown={setArchived}
					onClose={onClose}
				/>
			)}
		</PopoverSearch>
	);
}
