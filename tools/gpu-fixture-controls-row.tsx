import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuIcon, GpuText, GpuView } from "../packages/studio/src/features/canvas/gpu/index.ts";
import { LANGUAGE } from "./gpu-fixture-copy.ts";
import type { Direction, Tone } from "./gpu-fixture-copy.ts";
import { LanguagePicker } from "./gpu-fixture-language-picker.tsx";
import { Segmented } from "./gpu-fixture-segmented.tsx";

interface ControlsRowProps {
	readonly direction: Direction;
	readonly onSwap: () => void;
	readonly tone: Tone;
	readonly onTone: (tone: Tone) => void;
}

export function ControlsRow({ direction, onSwap, tone, onTone }: ControlsRowProps): ReactElement {
	const [from, to] = LANGUAGE[direction];
	return (
		<GpuView className="flex items-center gap-2">
			<LanguagePicker label={from} note={direction === "es-en" ? "detected" : null} />
			<GpuView
				className="w-9 h-9 rounded-lg items-center justify-center hover:bg-muted active:bg-accent transition text-muted-foreground"
				onPress={onSwap}
			>
				<GpuIcon name="arrow-left-right" size={16} />
			</GpuView>
			<LanguagePicker label={to} note={null} />
			<GpuView className="flex-1" />
			<GpuText className="text-sm text-muted-foreground">Register</GpuText>
			<Segmented value={tone} onChange={onTone} />
		</GpuView>
	);
}
