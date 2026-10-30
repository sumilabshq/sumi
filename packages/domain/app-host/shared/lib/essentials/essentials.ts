import type { Essential, KeptEssentials } from "../../schema/essential.schema.js";

export type EssentialFace = Omit<Essential, "id">;

export interface MovedEssentials {
	readonly kept: KeptEssentials;
	readonly reason: string;
}

export interface AddedEssential extends MovedEssentials {
	readonly id: string;
}

export const FIRST_ESSENTIALS: readonly EssentialFace[] = [
	{
		app: "canvas",
		address: null,
		title: "Canvas",
		favicon: null,
	},
];

export function essentialsOf(kept: KeptEssentials | null): KeptEssentials {
	return (
		kept ?? {
			essentials: FIRST_ESSENTIALS.map((face, at) => ({
				...face,
				id: `essential-${at + 1}`,
			})),
			minted: FIRST_ESSENTIALS.length,
		}
	);
}

export function findEssential(kept: KeptEssentials, id: string): Essential | undefined {
	return kept.essentials.find((essential) => essential.id === id);
}

export function nextEssentialIdOf(kept: KeptEssentials): string {
	return `essential-${kept.minted + 1}`;
}

export function addEssential(kept: KeptEssentials, face: EssentialFace, at: number): AddedEssential {
	const id = nextEssentialIdOf(kept);
	const { essentials } = kept;
	return {
		id,
		kept: {
			essentials: [...essentials.slice(0, at), { ...face, id }, ...essentials.slice(at)],
			minted: kept.minted + 1,
		},
		reason: `add ${id} "${face.title}" at ${at}`,
	};
}

export function moveEssential(kept: KeptEssentials, moved: Essential, at: number): MovedEssentials | null {
	const rest = kept.essentials.filter((essential) => essential.id !== moved.id);

	if (kept.essentials.indexOf(moved) === at) {
		return null;
	}

	return {
		kept: {
			...kept,
			essentials: [...rest.slice(0, at), moved, ...rest.slice(at)],
		},
		reason: `move ${moved.id} to ${at}`,
	};
}

export function removeEssential(kept: KeptEssentials, removed: Essential): MovedEssentials {
	return {
		kept: {
			...kept,
			essentials: kept.essentials.filter((essential) => essential.id !== removed.id),
		},
		reason: `remove ${removed.id} "${removed.title}"`,
	};
}
