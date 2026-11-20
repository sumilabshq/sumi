import { createElement as h, useLayoutEffect, useRef } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { CHAT_LOOK, markdownNodesOf } from "@widgetarium/markdown";
import { useBentoGalleries } from "../plugins/ai/chat-images/src/features/said-images/lib/use-bento-galleries.ts";

const picture = (name: string, width: number, height: number): string => `${location.origin}/pic/${name}/${String(width)}/${String(height)}.svg`;

const REPLIES: readonly (readonly [string, string])[] = [
	["Two wide screenshots", `![](${picture("A", 1600, 900)})\n![](${picture("B", 1600, 900)})`],
	["Wide + phone", `![](${picture("Desktop", 1440, 900)} "Desktop at 1440")\n![](${picture("Phone", 1170, 2532)} "Phone")`],
	["Tall phone + two wide", `![](${picture("Phone", 1170, 2532)})\n![](${picture("Chart", 1600, 1000)})\n![](${picture("Table", 1600, 1000)})`],
	["Banner + screenshot + tiny icon", `![](${picture("Banner", 2000, 400)})\n![](${picture("Shot", 1440, 900)})\n![](${picture("Icon", 48, 48)})`],
];

function Reply({ said }: { readonly said: string }): ReactElement {
	const holder = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		holder.current?.replaceChildren(...markdownNodesOf(document, said, CHAT_LOOK));
	}, [said]);
	useBentoGalleries(holder);
	return <div ref={holder} className="wg-studio-ai-said is-markdown" />;
}

function Page(): ReactElement {
	return (
		<div className="wg-root" style={{ width: 640, padding: 16 }}>
			{REPLIES.map(([title, said]) => (
				<section key={title} data-case={title}>
					<h4>{title}</h4>
					<Reply said={said} />
				</section>
			))}
		</div>
	);
}

const root = document.getElementById("root");

if (root !== null) {
	createRoot(root).render(<Page />);
}
