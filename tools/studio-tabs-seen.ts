export const TABS_SEEN = `(() => {
	const isShown = (node) => node !== null && node.getClientRects().length > 0;
	const at = (selector) => document.querySelector(selector);
	const shownAll = (selector) => [...document.querySelectorAll(selector)].filter(isShown);
	const column = at("[data-host-column]");
	const frame = at("[data-app-host-frame]")?.getBoundingClientRect() ?? null;
	const columnBox = column?.getBoundingClientRect() ?? null;
	const close = at("[data-host-close]");
	const railTabs = shownAll("[data-host-rail-tab]").map((tab) => ({ id: tab.dataset.hostRailTab, title: tab.getAttribute("aria-label"), isShown: tab.getAttribute("aria-current") === "true", w: Math.round(tab.getBoundingClientRect().width), h: Math.round(tab.getBoundingClientRect().height), words: "" }));
	const listTabs = shownAll("[data-host-list-tab]").map((tab) => ({ id: tab.dataset.hostListTab, title: tab.querySelector("button")?.textContent.trim() ?? "", isShown: tab.querySelector("[aria-current]") !== null, w: Math.round(tab.getBoundingClientRect().width), h: Math.round(tab.getBoundingClientRect().height), words: tab.textContent.trim() }));
	const headerTabs = [...document.querySelectorAll("[data-host-zone] [data-host-tab]")];
	const columnTabs = [...railTabs, ...listTabs];
	return {
		look: column?.dataset.hostColumn ?? "hidden",
		side: column?.dataset.hostColumnSide ?? null,
		columnWidth: Math.round(columnBox?.width ?? 0),
		columnAtEnd: columnBox !== null && frame !== null && Math.abs(columnBox.right - frame.right) <= 1,
		headerTabs: shownAll("[data-host-zone] [data-host-tab]").length,
		headerAllTabs: isShown(at("[data-host-all-tabs]")),
		headerAdd: isShown(at("[data-host-add]")),
		headerColumnToggle: isShown(at("[data-host-zone] [data-host-column-toggle]")),
		closeShown: isShown(close) && Math.round(close.getBoundingClientRect().height) === 48,
		columnToggle: isShown(at("[data-host-column] [data-host-column-toggle]")),
		columnAdd: isShown(at("[data-host-column] [data-host-column-add]")),
		columnTabs,
		tabCount: column === null ? headerTabs.length : columnTabs.length,
		titles: column === null ? headerTabs.map((tab) => tab.getAttribute("aria-label")) : columnTabs.map((tab) => tab.title),
	};
})()`;
