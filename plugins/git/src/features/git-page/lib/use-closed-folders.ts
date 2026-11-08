import { useState } from "react";
import { withToggled } from "./toggled-set.js";

export interface ClosedFolders {
	readonly closed: ReadonlySet<string>;
	toggle(path: string): void;
}

interface ClosedWhileSearching {
	readonly filter: string;
	readonly closed: ReadonlySet<string>;
}

const NONE_CLOSED: ReadonlySet<string> = new Set();

export function useClosedFolders(filter: string): ClosedFolders {
	const [browsing, setBrowsing] = useState<ReadonlySet<string>>(NONE_CLOSED);
	const [searching, setSearching] = useState<ClosedWhileSearching>({ filter: "", closed: NONE_CLOSED });
	const isSearching = filter.trim() !== "";
	const closedNow = searching.filter === filter ? searching.closed : NONE_CLOSED;
	return {
		closed: isSearching ? closedNow : browsing,
		toggle: (path) => {
			if (!isSearching) {
				setBrowsing((was) => withToggled(was, path));
				return;
			}

			setSearching({ filter, closed: withToggled(closedNow, path) });
		},
	};
}
