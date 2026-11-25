import { useEffect, useState } from "react";

export interface ProjectDraft {
	readonly flowId: string | null;
}

type Listener = (draft: ProjectDraft | null) => void;

const listeners = new Set<Listener>();
let requested: ProjectDraft | null = null;

export function requestProjectDraft(flowId: string | null): void {
	requested = { flowId };
	listeners.forEach((listener) => listener(requested));
}

export function useProjectDraft(): [ProjectDraft | null, () => void] {
	const [draft, setDraft] = useState<ProjectDraft | null>(requested);

	useEffect(() => {
		listeners.add(setDraft);
		setDraft(requested);

		return () => void listeners.delete(setDraft);
	}, []);

	return [
		draft,
		() => {
			requested = null;
			setDraft(null);
		},
	];
}
