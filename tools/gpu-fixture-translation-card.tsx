import { createElement as h } from "react";
import type { ReactElement } from "react";
import { GpuText, GpuView } from "../packages/studio/src/features/canvas/render/gpu/index.ts";
import { ActionButton } from "./gpu-fixture-action-button.tsx";
import { LANGUAGE, SOURCE, TRANSLATION } from "./gpu-fixture-copy.ts";
import type { Direction, Tone } from "./gpu-fixture-copy.ts";
import { TextPanel } from "./gpu-fixture-text-panel.tsx";

interface TranslationCardProps {
	readonly direction: Direction;
	readonly tone: Tone;
	readonly copied: boolean;
	readonly onCopy: () => void;
	readonly saved: boolean;
	readonly onSave: () => void;
}

export function TranslationCard({
	direction,
	tone,
	copied,
	onCopy,
	saved,
	onSave,
}: TranslationCardProps): ReactElement {
	const [from, to] = LANGUAGE[direction];
	const source = SOURCE[direction];
	return (
		<GpuView className="flex rounded-xl bg-group">
			<TextPanel
				heading={<GpuText className="text-sm text-muted-foreground">{from}</GpuText>}
				text={source}
				actions={[
					<ActionButton key="listen" kind="ghost" icon="volume-2" label="Listen" />,
					<GpuView key="gap" className="flex-1" />,
					<GpuText
						key="count"
						className="text-sm text-muted-foreground tabular-nums"
					>{`${source.length} / 5,000`}</GpuText>,
				]}
			/>
			<GpuView className="w-px bg-line" />
			<TextPanel
				heading={
					<GpuText className="text-sm text-muted-foreground">{`${to} · ${tone === "formal" ? "Formal" : "Casual"}`}</GpuText>
				}
				text={TRANSLATION[direction][tone]}
				actions={[
					<ActionButton key="listen" kind="ghost" icon="volume-2" label="Listen" />,
					<ActionButton
						key="copy"
						kind="outline"
						icon={copied ? "check" : "copy"}
						label={copied ? "Copied" : "Copy"}
						onPress={onCopy}
					/>,
					<GpuView key="gap" className="flex-1" />,
					<ActionButton
						key="save"
						kind="primary"
						icon={saved ? "check" : "bookmark"}
						label={saved ? "Saved" : "Save"}
						onPress={onSave}
					/>,
				]}
			/>
		</GpuView>
	);
}
