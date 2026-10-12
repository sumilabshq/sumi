import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuIcon, GpuText, GpuView } from "../apps/studio/src/legacy/features/canvas/render/gpu/index.ts";

export function LanguagePicker({
	label,
	note,
}: {
	readonly label: string;
	readonly note: string | null;
}): ReactElement {
	return (
		<GpuView
			className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-page hover:bg-muted active:bg-accent transition"
			onPress={() => {}}
		>
			<GpuText className="text-base font-medium text-foreground">{label}</GpuText>
			{note ? <GpuText className="text-sm text-muted-foreground">{note}</GpuText> : null}
			<GpuIcon name="chevron-down" size={16} className="text-muted-foreground" />
		</GpuView>
	);
}
