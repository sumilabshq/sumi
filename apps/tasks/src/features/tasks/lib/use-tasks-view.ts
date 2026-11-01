import { useState } from "react";
import type { BoardAsk, TaskStatus } from "@widgetarium/tasks";

export type TasksMode = "board" | "list";

export interface TasksView {
	readonly mode: TasksMode;
	readonly ask: BoardAsk;
	readonly search: string;
	readonly listStatus: TaskStatus | null;
	readonly showMode: (mode: TasksMode) => void;
	readonly askBoard: (change: Partial<BoardAsk>) => void;
	readonly searchFor: (search: string) => void;
	readonly listOnly: (status: TaskStatus) => void;
}

const FIRST_ASK: BoardAsk = {
	closedWithin: "day",
	closedOrder: "newest",
	kind: null,
	owner: null,
	isYourTurnOnly: false,
};

export function useTasksView(): TasksView {
	const [mode, setMode] = useState<TasksMode>("board");
	const [ask, setAsk] = useState(FIRST_ASK);
	const [search, setSearch] = useState("");
	const [listStatus, setListStatus] = useState<TaskStatus | null>(null);
	return {
		mode,
		ask,
		search,
		listStatus,
		showMode: (next) => {
			setListStatus(null);
			setMode(next);
		},
		askBoard: (change) =>
			setAsk((was) => ({
				...was,
				...change,
			})),
		searchFor: setSearch,
		listOnly: (status) => {
			setListStatus(status);
			setMode("list");
		},
	};
}
