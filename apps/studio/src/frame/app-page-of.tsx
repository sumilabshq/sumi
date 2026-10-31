import type { ReactElement } from "react";
import type { AppFace } from "@widgetarium/app-host";

type BuiltInPages = Readonly<Record<"canvas" | "browser" | "terminal" | "tasks", () => ReactElement>>;

interface AppPageAsk {
	readonly app: string;
	readonly faces: readonly AppFace[];
	readonly builtIn: BuiltInPages;
	readonly installed: () => ReactElement;
}

export function appPageOf({ app, faces, builtIn, installed }: AppPageAsk): ReactElement {
	const isBuiltIn = faces.some((face) => face.app === app && face.isBuiltIn);
	const drawn = isBuiltIn ? new Map(Object.entries(builtIn)).get(app) : undefined;
	return drawn === undefined ? installed() : drawn();
}
