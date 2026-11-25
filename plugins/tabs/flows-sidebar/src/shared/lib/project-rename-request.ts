import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
let requestedId: string | null = null;

export function requestProjectRename(projectId: string): void {
	requestedId = projectId;
	listeners.forEach((listener) => listener());
}

export function useProjectRenaming(projectId: string): [boolean, Dispatch<SetStateAction<boolean>>] {
	const [isRenaming, setIsRenaming] = useState(false);

	useEffect(() => {
		const claim = (): void => {
			if (requestedId !== projectId) {
				return;
			}

			requestedId = null;
			setIsRenaming(true);
		};
		listeners.add(claim);
		claim();

		return () => void listeners.delete(claim);
	}, [projectId]);

	return [isRenaming, setIsRenaming];
}
