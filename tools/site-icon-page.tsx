import { createElement as h } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { TabArt } from "../apps/studio/src/features/app-host/ui/tab-face/tab-art.tsx";
import type { TabArtSize } from "../apps/studio/src/features/app-host/ui/tab-face/tab-art.tsx";

const ICON_PX = 32;
const BROKEN_ICON = "data:image/png;base64,AAAA";

interface IconCase {
	readonly name: string;
	readonly favicon: string | null;
	readonly size: TabArtSize;
}

function drawnIcon(): string {
	const canvas = document.createElement("canvas");
	canvas.width = ICON_PX;
	canvas.height = ICON_PX;
	const paint = canvas.getContext("2d");

	if (paint === null) {
		return BROKEN_ICON;
	}

	paint.fillStyle = "rgb(234, 67, 53)";
	paint.beginPath();
	paint.arc(ICON_PX / 2, ICON_PX / 2, ICON_PX / 2 - 2, 0, Math.PI * 2);
	paint.fill();
	return canvas.toDataURL("image/png");
}

function IconCases(): ReactElement {
	const icon = drawnIcon();
	const cases: readonly IconCase[] = [
		{ name: "row-icon", favicon: icon, size: "row" },
		{ name: "row-letter", favicon: null, size: "row" },
		{ name: "row-broken", favicon: BROKEN_ICON, size: "row" },
		{ name: "tile-icon", favicon: icon, size: "tile" },
	];
	return (
		<div className="cv:w-[248px] cv:bg-(--sumi-frame) cv:p-2">
			{cases.map(({ name, favicon, size }) => (
				<div
					key={name}
					data-case={name}
					className="cv:flex cv:h-8 cv:items-center cv:gap-2 cv:px-2 cv:text-[13px] cv:text-(--sumi-text)"
				>
					<TabArt icon="site" favicon={favicon} title="Mail" address="https://mail.example/" size={size} />
					<span>{name}</span>
				</div>
			))}
		</div>
	);
}

const root = document.getElementById("root");

if (root !== null) {
	createRoot(root).render(<IconCases />);
}
