import type { FilledApp } from "../ui/app-tab/app-tab.js";

const APP_LINKS_HEAD = [
	"# Links to Sumi's apps",
	"",
	"Each app below takes links of this form. Build every link to a file, repo, branch or commit from it.",
].join("\n");

export function appLinkGuidesOf(apps: readonly FilledApp[]): string {
	const guides = apps.flatMap(({ title, linkGuide }) => (linkGuide === undefined ? [] : [`- ${title}: ${linkGuide}`]));
	return guides.length === 0 ? "" : [APP_LINKS_HEAD, "", ...guides].join("\n");
}
