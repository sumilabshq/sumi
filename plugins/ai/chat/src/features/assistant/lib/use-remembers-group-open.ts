import { createContext, useContext, useState } from "react";
import type { Context } from "react";

export const OpenGroupsContext: Context<Set<string> | null> = createContext<Set<string> | null>(null);

export function useRemembersGroupOpen(key: string | undefined): readonly [boolean, (isOpen: boolean) => void] {
	const opened = useContext(OpenGroupsContext);
	const [isOpen, setOpen] = useState(() => key !== undefined && opened?.has(key) === true);
	const choose = (next: boolean): void => {
		setOpen(next);
		rememberChoice(opened, key, next);
	};
	return [isOpen, choose];
}

function rememberChoice(opened: Set<string> | null, key: string | undefined, isOpen: boolean): void {
	if (key === undefined || opened === null) {
		return;
	}

	if (isOpen) {
		opened.add(key);
		return;
	}

	opened.delete(key);
}
