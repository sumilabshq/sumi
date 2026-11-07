import type { AppFace } from "@sumi/apps";
import type { FilledApp } from "../ui/app-tab/app-tab.js";
import { iconUrlOf } from "./icon-url.js";

export function faceOf({ id, title, icon, art, isListed }: FilledApp): AppFace {
	return {
		id,
		title,
		iconUrl: icon === undefined ? null : iconUrlOf(icon),
		art: art ?? null,
		isListed: isListed ?? true,
	};
}
