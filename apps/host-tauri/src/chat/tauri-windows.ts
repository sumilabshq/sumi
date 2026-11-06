import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const LIVE_WINDOWS = "plugin:studio-core|live_windows";
const LabelsSchema = z.array(z.string());

export function ownWindowLabel(): string {
	return getCurrentWindow().label;
}

export async function liveWindowLabels(): Promise<readonly string[]> {
	return LabelsSchema.parse(await invoke(LIVE_WINDOWS));
}
