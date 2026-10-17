import { CopyButton } from "./copy-button";
import type { RenderMarkdown } from "./types";
import { useRenderedCodeBlocks } from "./use-rendered-code-blocks";

export function Preview({ markdown, render }: { markdown: string; render?: RenderMarkdown | undefined }) {
	const { holder, blocks } = useRenderedCodeBlocks(markdown, render);
	return (
		<>
			<div className="otd-md" ref={holder} />
			{blocks.map((block, at) => (
				<CopyButton key={at} block={block} />
			))}
		</>
	);
}
