import { ICON_LINKS } from "../../../shared/lib/page-icon-links.js";

export const ICONS_UNCHANGED = "same";

const MOST_HREF_CHARACTERS = 70_000;
const WATCHED_ATTRIBUTES = '["href", "rel", "sizes", "type", "media"]';

export function readPageIconsScript(isForced: boolean): string {
	return `(() => {
	const held = (globalThis.__wgSiteIcons ??= { isDirty: true, head: null });
	const head = document.head;
	if (head && held.head !== head) {
		held.head = head;
		held.isDirty = true;
		new MutationObserver(() => { held.isDirty = true; }).observe(head, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ${WATCHED_ATTRIBUTES},
		});
	}
	if (!held.isDirty && !${String(isForced)}) return ${JSON.stringify(ICONS_UNCHANGED)};
	held.isDirty = false;
	const links = [...document.querySelectorAll(${JSON.stringify(ICON_LINKS)})]
		.filter((link) => link.href.length <= ${MOST_HREF_CHARACTERS})
		.slice(0, 64)
		.map((link) => ({
		href: link.href,
		rel: link.rel,
		sizes: link.getAttribute("sizes") || "",
		type: (link.type || "").toLowerCase(),
		isMatching: !link.media || matchMedia(link.media).matches,
	}));
	return JSON.stringify({ page: location.href, links });
})()`;
}
