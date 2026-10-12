import { createElement as h, useState } from "react";
import { defineLayout, defineMetadata, defineStates } from "../packages/core/src/gateway/declared.js";
import { createWidget } from "../packages/core/src/widget-api.js";

export const HARVEST_TITLE = "Harvest log";
export const PICKED_SAID = "Picked {count}";
export const HOVERED_CROP = "Runner beans";

const CROPS = [
	{ name: HOVERED_CROP, kilos: 12 },
	{ name: "Butternut squash", kilos: 31 },
	{ name: "Sweet corn", kilos: 8 },
];

const HarvestLog = createWidget({
	draw: () => {
		const [picked, setPicked] = useState(0);
		return (
			<section className="flex flex-col gap-4 p-6">
				<header className="flex flex-row items-center justify-between">
					<h2 className="text-lg font-semibold">{HARVEST_TITLE}</h2>
					<span className="text-xs text-muted-foreground">Week 32</span>
				</header>
				<p className="text-sm text-muted-foreground">Beans and squash came in early this week.</p>
				<ul className="flex flex-col gap-1">
					{CROPS.map((crop) => (
						<li key={crop.name} className="flex flex-row justify-between px-3 py-2 rounded-lg hover:bg-fill-hover">
							<span>{crop.name}</span>
							<b>{`${crop.kilos} kg`}</b>
						</li>
					))}
				</ul>
				<form className="flex flex-row items-center gap-2">
					<input className="flex-1 px-3 py-2 rounded-lg bg-muted" placeholder="Add a crop" />
					<button
						type="button"
						className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
						onClick={() => setPicked((count) => count + 1)}
					>
						{PICKED_SAID.replace("{count}", String(picked))}
					</button>
				</form>
				<footer className="flex flex-row items-center gap-2">
					<svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
						<path d="M12 2v20M2 12h20" />
					</svg>
					<a href="#map" className="text-sm">
						Open the field map
					</a>
					<img alt="Field photo" width={96} height={64} />
				</footer>
			</section>
		);
	},
});

export const metadata = defineMetadata(HarvestLog, {
	title: "Harvest log",
	description: "What came in from the field this week?",
	keywords: ["harvest"],
	props: {},
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: 480, preferredHeight: "auto" } });

export const states = defineStates(HarvestLog, { Week: {} });

export default HarvestLog;
