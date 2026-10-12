import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { GpuText, GpuView } from "../packages/studio/src/features/canvas/render/gpu/index.ts";
import { ControlsRow } from "./gpu-fixture-controls-row.tsx";
import { FIRST_RECENT, LANGUAGE, SOURCE, TRANSLATION } from "./gpu-fixture-copy.ts";
import type { Direction, Recent, Tone } from "./gpu-fixture-copy.ts";
import { RecentList } from "./gpu-fixture-recent-list.tsx";
import { TopBar } from "./gpu-fixture-top-bar.tsx";
import { TranslationCard } from "./gpu-fixture-translation-card.tsx";
import { useCopiedFlag } from "./gpu-fixture-use-copied.ts";

const KEPT_RECENT = 6;

export function Translator({ index }: { readonly index: number }): ReactElement {
	const [tone, setTone] = useState<Tone>(index % 2 === 0 ? "formal" : "casual");
	const [direction, setDirection] = useState<Direction>("es-en");
	const [recent, setRecent] = useState<readonly Recent[]>(FIRST_RECENT);
	const [copied, copy] = useCopiedFlag();
	const translation = TRANSLATION[direction][tone];
	const saved = recent[0]?.target === translation;
	const save = (): void => {
		const entry = {
			source: SOURCE[direction],
			target: translation,
			pair: direction === "es-en" ? "ES → EN" : "EN → ES",
			when: "Just now",
		};
		if (!saved) setRecent((rows) => [entry, ...rows].slice(0, KEPT_RECENT));
	};
	const swap = (): void => setDirection((current) => (current === "es-en" ? "en-es" : "es-en"));
	return (
		<GpuView className="w-full bg-page">
			<TopBar />
			<GpuView className="px-12 pt-10 pb-12 gap-8">
				<GpuView className="gap-1">
					<GpuText className="font-serif text-h1 leading-[40px] tracking-tight text-foreground">Translate</GpuText>
					<GpuText className="text-base text-muted-foreground">{`${LANGUAGE[direction].join(" into ")}. Pick a register before you send it.`}</GpuText>
				</GpuView>
				<ControlsRow direction={direction} onSwap={swap} tone={tone} onTone={setTone} />
				<TranslationCard direction={direction} tone={tone} copied={copied} onCopy={copy} saved={saved} onSave={save} />
				<RecentList recent={recent} />
			</GpuView>
		</GpuView>
	);
}
