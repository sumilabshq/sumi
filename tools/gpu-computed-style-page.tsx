import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { Select, ToggleGroup } from "radix-ui";
import { startGpuCanvas } from "../packages/shared/gpu/index.ts";
import type { CanvasPoint, GpuCanvas } from "../packages/shared/gpu/index.ts";
import { loadFixtureCanvasKit, loadFixtureFonts } from "./gpu-canvas-fixture.tsx";

const STYLE_FRAME = "computed-style";
const CONTROL_FRAME = "control";
const CONTROL_AT_Y = 2000;
const SAID = {
	sheet: ".never-painted { color: red; }",
	chosen: "Second label",
	lateGap: ".late-gap { gap: 30px; }",
	closedOption: "Bulgarian",
	hiddenByAttribute: "Hidden by attribute",
	hiddenBySheet: "Hidden by sheet",
	portalled: "Portalled to the body",
	chosenLanguage: "Arabic",
	tone: "formal",
	toneShown: "Formal",
};

const TOGGLE_ROOT = "inline-flex rounded-pill bg-fill p-0.5";
const TOGGLE_ITEM =
	"h-auto! shadow-none! cursor-pointer border-0! bg-transparent! justify-start! rounded-pill! px-3! py-1! text-sm! capitalize text-muted-foreground! transition-colors duration-150 hover:text-foreground! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-raise! data-[state=on]:text-foreground!";
const MARKED_ITEM = "w-[60px] h-[20px] data-[state=on]:bg-[#ff0000]!";
const groupFlip = {
	flip: (): void => undefined,
};

interface StylePage {
	readonly failures: string[];
	readonly said: typeof SAID;
	ready: boolean;
	locate(text: string): CanvasPoint | null;
	locateControl(text: string): CanvasPoint | null;
	textIn(includes: string): string | null;
	wearSheet(css: string): void;
	flipGroup(): void;
}

const FRAME_WIDTH = 400;
const failures: string[] = [];
addEventListener("error", (event) => failures.push(String(event.message)));
addEventListener("unhandledrejection", (event) => failures.push(String(event.reason)));

const canvas = document.getElementById("stage");
if (canvas instanceof HTMLCanvasElement) void begin(canvas);
else failures.push("the page has no #stage canvas");

function StyledFixture(): ReactElement {
	return (
		<div className="flex flex-col">
			<style>{SAID.sheet}</style>
			<select value="b" onChange={() => undefined}>
				<option value="a">First label</option>
				<option value="b">{SAID.chosen}</option>
			</select>
			<div style={{ padding: 10 }}>
				<div className="w-[40px] h-[20px]">PAD</div>
			</div>
			<div className="flex flex-col gap-parts">
				<div className="h-[20px]">G1</div>
				<div className="h-[20px]">G2</div>
			</div>
			<div className="flex flex-col late-gap">
				<div className="h-[20px]">L1</div>
				<div className="h-[20px]">L2</div>
			</div>
			<ClosedSelect />
			<AttributeVariants />
			<ToneToggle />
			<div hidden>{SAID.hiddenByAttribute}</div>
			<div className="gone-by-sheet">{SAID.hiddenBySheet}</div>
			{createPortal(<div>{SAID.portalled}</div>, document.body)}
		</div>
	);
}

function ClosedSelect(): ReactElement {
	return (
		<Select.Root value="ar">
			<Select.Trigger>
				<Select.Value />
			</Select.Trigger>
			<Select.Portal>
				<Select.Content position="popper">
					<Select.Viewport>
						<Select.Item value="ar">
							<Select.ItemText>Arabic</Select.ItemText>
						</Select.Item>
						<Select.Item value="bg">
							<Select.ItemText>{SAID.closedOption}</Select.ItemText>
						</Select.Item>
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
}

function AttributeVariants(): ReactElement {
	return (
		<div className="flex flex-col">
			<div data-state="on" className="data-[state=on]:pl-[30px]">
				<div className="w-[40px] h-[20px]">DS</div>
			</div>
			<div role="radio" aria-checked="true" className="aria-checked:pl-[30px]">
				<div className="w-[40px] h-[20px]">AC</div>
			</div>
			<div data-state="on" className="group">
				<div className="group-data-[state=on]:pl-[30px]">
					<div className="w-[40px] h-[20px]">GD</div>
				</div>
			</div>
			<FlippedGroup />
		</div>
	);
}

function FlippedGroup(): ReactElement {
	const [state, setState] = useState("off");
	useEffect(() => {
		groupFlip.flip = () => setState("on");
	}, []);
	return (
		<div data-state={state} className="group">
			<div className="group-data-[state=on]:pl-[30px]">
				<div className="w-[40px] h-[20px]">GF</div>
			</div>
		</div>
	);
}

function UnpaddedTones(): ReactElement {
	return (
		<div className="flex text-sm capitalize">
			<div>{SAID.tone}</div>
			<div>casual</div>
		</div>
	);
}

function ToneToggle(): ReactElement {
	return (
		<div className="flex flex-col">
			<ToggleGroup.Root type="single" value="a" className={TOGGLE_ROOT}>
				<ToggleGroup.Item value="a" className={TOGGLE_ITEM}>
					<div className="w-[40px] h-[20px]">T1</div>
				</ToggleGroup.Item>
				<ToggleGroup.Item value="b" className={TOGGLE_ITEM}>
					<div className="w-[40px] h-[20px]">T2</div>
				</ToggleGroup.Item>
			</ToggleGroup.Root>
			<ToggleGroup.Root type="single" value={SAID.tone} className={TOGGLE_ROOT}>
				<ToggleGroup.Item value={SAID.tone} className={TOGGLE_ITEM}>
					{SAID.tone}
				</ToggleGroup.Item>
				<ToggleGroup.Item value="casual" className={TOGGLE_ITEM}>
					casual
				</ToggleGroup.Item>
			</ToggleGroup.Root>
			<ToggleGroup.Root type="single" value="on" className="flex">
				<ToggleGroup.Item value="on" className={MARKED_ITEM}>
					ON
				</ToggleGroup.Item>
			</ToggleGroup.Root>
			<div className="w-[60px] h-[20px] marked-red">RED</div>
		</div>
	);
}

async function begin(stage: HTMLCanvasElement): Promise<void> {
	try {
		const gpu = await startGpuCanvas(stage, { loadCanvasKit: loadFixtureCanvasKit, fonts: await loadFixtureFonts() });
		gpu.addFrame({
			id: STYLE_FRAME,
			title: "Computed style",
			width: FRAME_WIDTH,
			at: { x: 0, y: 0 },
			element: <StyledFixture />,
		});
		gpu.addFrame({
			id: CONTROL_FRAME,
			title: "Control",
			width: FRAME_WIDTH,
			at: { x: 0, y: CONTROL_AT_Y },
			element: <UnpaddedTones />,
		});
		gpu.setCamera({ x: 0, y: 0, zoom: 1 });
		const page: StylePage = {
			failures,
			said: SAID,
			ready: true,
			flipGroup: () => groupFlip.flip(),
			...answersOf(gpu),
		};
		Object.assign(window, { stylePage: page });
	} catch (failure) {
		failures.push(failure instanceof Error ? failure.message : String(failure));
	}
}

function answersOf(gpu: GpuCanvas): Pick<StylePage, "locate" | "locateControl" | "textIn" | "wearSheet"> {
	return {
		locate: (text) => gpu.locateText(STYLE_FRAME, text),
		locateControl: (text) => gpu.locateText(CONTROL_FRAME, text),
		textIn: (includes) => gpu.textIn(STYLE_FRAME, includes),
		wearSheet: (css) => {
			const sheet = document.createElement("style");
			sheet.dataset["widgetarium"] = "computed-style-test";
			sheet.textContent = css;
			document.head.appendChild(sheet);
		},
	};
}
