import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuText, GpuView } from "../packages/studio/src/features/canvas/render/gpu/index.ts";

export function NavWord({
	label,
	active = false,
}: {
	readonly label: string;
	readonly active?: boolean;
}): ReactElement {
	return (
		<GpuView
			className={`h-8 px-3 justify-center rounded-md transition ${active ? "bg-muted" : "hover:bg-accent"}`}
			onPress={() => {}}
		>
			<GpuText className={`text-base ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
				{label}
			</GpuText>
		</GpuView>
	);
}
