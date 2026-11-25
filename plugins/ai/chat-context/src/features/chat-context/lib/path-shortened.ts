import { homeShortened } from "./home-shortened.js";

export const PATH_CHARS = 28;

export function pathShortened(folder: string, budget: number = PATH_CHARS): string {
	const whole = homeShortened(folder);

	if (whole.length <= budget) {
		return whole;
	}

	const parts = whole.split("/");
	const [root = "", first = ""] = parts;
	const middleCut = `${root}/${first}/…/${parts.slice(-2).join("/")}`;

	if (parts.length > 4 && middleCut.length <= budget) {
		return middleCut;
	}

	return `${root}/…/${parts.at(-1) ?? ""}`;
}
