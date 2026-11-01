import type { ReactElement } from "react";
import type { AppFace } from "@widgetarium/app-host";

interface AppPageAsk {
	readonly app: string;
	readonly faces: readonly AppFace[];
	readonly builtIn: Readonly<Record<string, () => ReactElement>>;
	readonly installed: () => ReactElement;
}

export function appPageOf({ app, faces, builtIn, installed }: AppPageAsk): ReactElement {
	const isBuiltIn = faces.some((face) => face.app === app && face.isBuiltIn);
	const drawn = isBuiltIn && Object.hasOwn(builtIn, app) ? builtIn[app] : undefined;
	return drawn === undefined ? installed() : drawn();
}
