import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuText, GpuView } from "../packages/shared/gpu/index.ts";
import type { Tone } from "./gpu-fixture-copy.ts";

interface SegmentedProps {
	readonly value: Tone;
	readonly onChange: (tone: Tone) => void;
}

const SEGMENTS: readonly (readonly [Tone, string])[] = [
	["formal", "Formal"],
	["casual", "Casual"],
];

export function Segmented({ value, onChange }: SegmentedProps): ReactElement {
	return (
		<GpuView className="flex items-center p-1 gap-1 rounded-lg bg-muted border border-line">
			{SEGMENTS.map(([tone, label]) => (
				<GpuView
					key={tone}
					className={`h-7 px-3 justify-center rounded-md border transition ${value === tone ? "bg-page border-line" : "border-transparent hover:bg-accent"}`}
					onPress={() => onChange(tone)}
				>
					<GpuText className={`text-sm font-medium ${value === tone ? "text-foreground" : "text-muted-foreground"}`}>
						{label}
					</GpuText>
				</GpuView>
			))}
		</GpuView>
	);
}
