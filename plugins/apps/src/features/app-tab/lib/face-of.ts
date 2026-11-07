import type { AppFace } from "@sumi/apps";
import type { FilledApp } from "../ui/app-tab/app-tab.js";
import { iconUrlOf } from "./icon-url.js";

export function faceOf({ id, title, icon }: FilledApp): AppFace {
	return { id, title, iconUrl: iconUrlOf(icon) };
}
