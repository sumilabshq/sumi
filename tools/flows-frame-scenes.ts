export type FrameSplit = "single" | "split" | "stacked";

export const FRAME_SPLITS: readonly FrameSplit[] = ["single", "split", "stacked"];

const SCENE_SUFFIXES: Readonly<Record<FrameSplit, string>> = { single: "+board", split: "+split", stacked: "+stacked" };

export const SPLIT_SIDES: Readonly<Record<FrameSplit, "right" | "bottom" | null>> = {
	single: null,
	split: "right",
	stacked: "bottom",
};

export function sceneOf(sidebarScene: string, split: FrameSplit): string {
	return `${sidebarScene}${SCENE_SUFFIXES[split]}`;
}

export function splitOfScene(asked: string): FrameSplit | null {
	return FRAME_SPLITS.find((split) => asked.endsWith(SCENE_SUFFIXES[split])) ?? null;
}

export function sidebarSceneOf(asked: string, split: FrameSplit | null): string {
	return split === null ? asked : asked.slice(0, -SCENE_SUFFIXES[split].length);
}
