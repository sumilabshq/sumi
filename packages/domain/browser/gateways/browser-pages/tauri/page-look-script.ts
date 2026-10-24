import { z } from "zod";

export const PageColoursReadSchema = z.object({
	href: z.string(),
	theme: z.string().nullable(),
	page: z.string().nullable(),
	canvas: z.string(),
	isPatterned: z.boolean(),
	topIsPicture: z.boolean(),
	scrollY: z.number(),
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
	const isPictured = (element) => Boolean(element) && getComputedStyle(element).backgroundImage !== "none";
	const root = document.documentElement;
	const body = document.body;
	const isPicture = (element) => /^(IMG|VIDEO|CANVAS|PICTURE|IFRAME)$/.test(element.tagName) || isPictured(element);
	const pictureAt = (across) => {
		for (let at = document.elementFromPoint(innerWidth * across, 1); at && at !== body && at !== root; at = at.parentElement) {
			if (isPicture(at)) return true;
			if (opaqueOf(at)) return false;
		}
		return false;
	};
	const metas = [...document.querySelectorAll('meta[name="theme-color" i]')];
	const theme = metas.find((meta) => !meta.media || matchMedia(meta.media).matches);
	const scheme = getComputedStyle(root).colorScheme || "";
	const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
	const isDarkCanvas = scheme.includes("dark") && (!scheme.includes("light") || prefersDark);
	return JSON.stringify({
		href: location.href,
		theme: normalOf(theme ? theme.content : null),
		page: opaqueOf(root) || opaqueOf(body),
		canvas: isDarkCanvas ? "rgb(18, 18, 18)" : "rgb(255, 255, 255)",
		isPatterned: isPictured(root) || isPictured(body),
		topIsPicture: [0.25, 0.5, 0.75].some(pictureAt),
		scrollY: Math.round(scrollY),
	});
})()`;
