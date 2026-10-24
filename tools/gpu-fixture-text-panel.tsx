import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { GpuText, GpuView } from "../packages/shared/gpu/index.ts";

interface TextPanelProps {
	readonly heading: ReactNode;
	readonly text: string;
	readonly actions: ReactNode;
}

export function TextPanel({ heading, text, actions }: TextPanelProps): ReactElement {
	return (
		<GpuView className="flex-1 p-6 gap-6 min-h-[248px]">
			{heading}
			<GpuText className="text-[18px] leading-[28px] text-foreground">{text}</GpuText>
			<GpuView className="flex-1" />
			<GpuView className="flex items-center gap-2">{actions}</GpuView>
		</GpuView>
	);
}
