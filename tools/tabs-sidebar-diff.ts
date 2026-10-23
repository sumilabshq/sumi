import { waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import type { Theme } from "./harness.ts";
import { THEMED, boardPageFile } from "./tabs-sidebar-pages.ts";

export interface Pair {
	readonly name: string;
	readonly board: string;
	readonly built: string;
	readonly builtPseudo?: "::before";
	readonly only?: readonly string[];
	readonly skip?: readonly string[];
}

export interface Scene {
	readonly board: string;
	readonly pairs: readonly Pair[];
	readonly enter: (page: AskedPage) => Promise<void>;
	readonly leave: (page: AskedPage) => Promise<void>;
}

const PROPS = [
	"width",
	"height",
	"paddingTop",
	"paddingRight",
	"paddingBottom",
	"paddingLeft",
	"marginTop",
	"columnGap",
	"rowGap",
	"fontSize",
	"fontWeight",
	"color",
	"backgroundColor",
	"borderTopLeftRadius",
	"boxShadow",
	"opacity",
] as const;
const PX_SLACK = 0.6;
const BOARD_LOAD_MS = 700;
const STYLE_OF = `((selector, pseudo, props) => { const el = document.querySelector(selector); if (!el) return null; const style = getComputedStyle(el, pseudo || null); const box = el.getBoundingClientRect(); const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); const colourOf = (said) => { pen.clearRect(0, 0, 1, 1); pen.fillStyle = "rgba(0, 0, 0, 0)"; pen.fillStyle = said; pen.fillRect(0, 0, 1, 1); const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data; return a === 255 ? "rgb(" + r + ", " + g + ", " + b + ")" : a === 0 ? "rgba(0, 0, 0, 0)" : "rgba(" + r + ", " + g + ", " + b + ", " + Math.round((a / 255) * 100) / 100 + ")"; }; const COLOURS = ["color", "backgroundColor"]; const said = {}; for (const prop of props) said[prop] = prop === "width" ? String(Math.round(box.width * 10) / 10) : prop === "height" ? String(Math.round(box.height * 10) / 10) : COLOURS.includes(prop) ? colourOf(style[prop]) : style[prop]; return said; })`;

export interface DiffPages {
	readonly built: AskedPage;
	readonly board: AskedPage;
}

export async function sceneDiff(
	{ built, board: boardPage }: DiffPages,
	folder: string,
	scene: Scene,
	theme: Theme,
): Promise<readonly string[]> {
	console.info(`[tabs-sidebar] ${theme} ${scene.board}`);
	await boardPage.ask(
		`location.replace(${JSON.stringify(`file://${boardPageFile(folder, scene.board, theme)}`)}); true`,
	);
	await waited(BOARD_LOAD_MS);
	await built.ask(`${THEMED}(${JSON.stringify(theme)})`);
	await waited(BOARD_LOAD_MS);
	await scene.enter(built);
	const found: string[] = [];

	for (const pair of scene.pairs) {
		const props = PROPS.filter((prop) => (pair.only ?? PROPS).includes(prop) && !(pair.skip ?? []).includes(prop));
		const boardSaid = await boardPage.ask(`${STYLE_OF}(${JSON.stringify(pair.board)}, "", ${JSON.stringify(props)})`);
		const builtSaid = await built.ask(
			`${STYLE_OF}(${JSON.stringify(pair.built)}, ${JSON.stringify(pair.builtPseudo ?? "")}, ${JSON.stringify(props)})`,
		);

		if (!isSaid(boardSaid) || !isSaid(builtSaid)) {
			found.push(`${theme} ${scene.board} ${pair.name}: missing ${isSaid(boardSaid) ? "built" : "board"} element`);
			continue;
		}

		for (const prop of props) {
			const wanted = boardSaid[prop] ?? "";
			const drawn = builtSaid[prop] ?? "";

			if (!isSame(wanted, drawn)) {
				found.push(`${theme} ${scene.board} ${pair.name} ${prop}: board ${wanted} | built ${drawn}`);
			}
		}
	}

	await scene.leave(built);
	return found;
}

function isSaid(said: unknown): said is Readonly<Record<string, string>> {
	return typeof said === "object" && said !== null;
}

function isSame(wanted: string, drawn: string): boolean {
	if (wanted === drawn) {
		return true;
	}

	const wantedPx = parseFloat(wanted);
	const drawnPx = parseFloat(drawn);
	const isLength = /^-?[\d.]+(px)?$/.test(wanted) && /^-?[\d.]+(px)?$/.test(drawn);
	return isLength && Math.abs(wantedPx - drawnPx) <= PX_SLACK;
}
