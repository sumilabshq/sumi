import type { ReactElement } from "react";
import type { AppFace } from "@widgetarium/app-host";

interface AppPageAsk<BuiltIn extends string> {
	readonly app: string;
	readonly faces: readonly AppFace[];
	readonly builtIn: Readonly<Record<BuiltIn, () => ReactElement>>;
	readonly installed: () => ReactElement;
}

export function appPageOf<BuiltIn extends string>({
	app,
	faces,
	builtIn,
	installed,
}: AppPageAsk<BuiltIn>): ReactElement {
	const isBuiltIn = faces.some((face) => face.app === app && face.isBuiltIn);
	const drawn = isBuiltIn ? new Map<string, () => ReactElement>(Object.entries(builtIn)).get(app) : undefined;
	return drawn === undefined ? installed() : drawn();
}
