import { findSection, pagesBySection, searchSettings, settingsRegistry } from "@sumi/settings-registry-plugin";
import type { SettingsPageEntry } from "@sumi/settings-registry-plugin";
import { appearancePage } from "../plugins/settings/appearance/src/features/appearance/lib/appearance-page.ts";
import { check, thrownBy, tally } from "./check-helpers.ts";

const view = (): null => null;
const looks: SettingsPageEntry = {
	id: "looks",
	title: "Looks",
	icon: "palette",
	section: "Sumi",
	order: 10,
	description: "How things look.",
	keywords: ["colour"],
	view,
	sections: [
		{ id: "theme", title: "Theme", description: "Black paper or white paper." },
		{
			id: "text",
			title: "Text",
			sections: [
				{ id: "headings", title: "Headings", keywords: ["titles"] },
				{ id: "code", title: "Code" },
			],
		},
	],
};
const extras: SettingsPageEntry = {
	id: "extras",
	title: "Extras",
	icon: "plug",
	section: "Extend Sumi",
	order: 10,
	keywords: ["theme"],
	view,
	sections: [{ id: "build", title: "Build your own extra", description: "Looks for a theme." }],
};
const pages = [extras, looks];
const first = (query: string): unknown => {
	const [hit] = searchSettings(pages, query);
	return hit === undefined ? null : [hit.kind, hit.pageId, ...hit.sectionPath];
};

check("an empty query finds nothing", searchSettings(pages, ""), []);
check("a blank query finds nothing", searchSettings(pages, "   "), []);
check("a part of a section title finds the nested section", first("head"), ["section", "looks", "text", "headings"]);
check("a nested section carries the titles above it as its trail", searchSettings(pages, "head")[0]?.trail, [
	"Looks",
	"Text",
]);
check("a page hit has an empty trail and path", searchSettings(pages, "extr")[0]?.sectionPath, []);
check("a title that starts with the query beats one that contains it", first("e"), ["page", "extras"]);
check("a title match beats a keyword match", first("theme"), ["section", "looks", "theme"]);
check("a keyword match finds the section", first("titles"), ["section", "looks", "text", "headings"]);
check(
	"a description match is named as such",
	searchSettings(pages, "black paper").map(({ matchedIn }) => matchedIn),
	["description"],
);
check(
	"a page comes before a section on equal rank",
	searchSettings(pages, "look").map(({ kind, pageId, matchedIn }) => [kind, pageId, matchedIn]),
	[
		["page", "looks", "title"],
		["section", "extras", "description"],
	],
);
check("the match ignores case", first("HEAD"), ["section", "looks", "text", "headings"]);
check("nothing matching finds nothing", searchSettings(pages, "zzz"), []);

const installed = [appearancePage];
const installedFirst = (query: string): unknown => {
	const [hit] = searchSettings(installed, query);
	return hit === undefined ? null : [hit.kind, hit.pageId, ...hit.sectionPath, hit.trail.join(" > ")];
};

check("head finds Appearance > Text > Headings", installedFirst("head"), [
	"section",
	"appearance",
	"text",
	"headings",
	"Appearance > Text",
]);
check("theme finds the Theme section before the page that lists it as a keyword", installedFirst("theme"), [
	"section",
	"appearance",
	"theme",
	"Appearance",
]);

check(
	"a section text other than Sumi becomes a labelled group after the unlabelled one",
	pagesBySection(pages).map(({ label, pages: grouped }) => [label, grouped.map(({ id }) => id)]),
	[
		[null, ["looks"]],
		["Extend Sumi", ["extras"]],
	],
);
check("a section is found by its id at any depth", findSection(looks, "code")?.title, "Code");
check("an unknown section id is not found", findSection(looks, "nope"), undefined);

const registry = settingsRegistry.applyWith(undefined as never);
if (registry === undefined) throw new Error("the settings registry returned no API");
check(
	"a page repeating a section id is refused",
	thrownBy(() => registry.page({ ...looks, sections: [{ id: "a", title: "A", sections: [{ id: "a", title: "A" }] }] })),
	'settings page "looks" has section id "a" more than once',
);

console.log(tally.failed ? `settings search: ${tally.failed} check(s) failed` : "settings search: all checks passed");
process.exit(tally.failed ? 1 : 0);
