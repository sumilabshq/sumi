import { z } from "zod";

export const PageColoursReadSchema = z.object({
	theme: z.string().nullable(),
	top: z.string().nullable(),
	page: z.string().nullable(),
	canvas: z.string(),
	width: z.number(),
});

export type PageColoursRead = z.infer<typeof PageColoursReadSchema>;

export const READ_PAGE_COLOURS = `(() => {
	const paint = document.createElement("canvas").getContext("2d");
	const normalOf = (colour) => {
		if (!paint || !colour) return null;
		paint.fillStyle = "#000000";
		paint.fillStyle = colour;
		const onBlack = paint.fillStyle;
		paint.fillStyle = "#ffffff";
		paint.fillStyle = colour;
		return onBlack === paint.fillStyle ? onBlack : null;
	};
	const opaqueOf = (element) => {
		if (!element) return null;
		const colour = getComputedStyle(element).backgroundColor;
		const alpha = /rgba\\([^)]*,\\s*([\\d.]+)\\)/.exec(colour);
		return alpha && Number(alpha[1]) < 0.98 ? null : colour;
	};
	const topOf = () => {
		for (let element = document.elementFromPoint(innerWidth / 2, 1); element; element = element.parentElement) {
			const colour = opaqueOf(element);
			if (colour) return colour;
		}
		return null;
	};
	const root = document.documentElement;
	const body = document.body;
	const metas = [...document.querySelectorAll('meta[name="theme-color" i]')];
	const theme = metas.find((meta) => !meta.media || matchMedia(meta.media).matches);
	const scheme = getComputedStyle(root).colorScheme || "";
	const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
	const isDarkCanvas = scheme.includes("dark") && (!scheme.includes("light") || prefersDark);
	return JSON.stringify({
		theme: normalOf(theme ? theme.content : null),
		top: topOf(),
		width: innerWidth,
		page: opaqueOf(root) || opaqueOf(body),
		canvas: isDarkCanvas ? "rgb(18, 18, 18)" : "rgb(255, 255, 255)",
	});
})()`;
