import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
let requestedId: string | null = null;

export function requestFolderRename(folderId: string): void {
	requestedId = folderId;
	listeners.forEach((listener) => listener());
}

export function useFolderRenaming(folderId: string): [boolean, Dispatch<SetStateAction<boolean>>] {
	const [isRenaming, setIsRenaming] = useState(false);

	useEffect(() => {
		const claim = (): void => {
			if (requestedId !== folderId) {
				return;
			}

			requestedId = null;
			setIsRenaming(true);
		};
		listeners.add(claim);
		claim();

		return () => void listeners.delete(claim);
	}, [folderId]);

	return [isRenaming, setIsRenaming];
}
