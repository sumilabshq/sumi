import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/shared/framework/src/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { ReadPageContentCommand } from "../packages/domain/browser/index.ts";
import { check, waitFor } from "./check-helpers.ts";
import { inBrowserPlate } from "./browser-plate.ts";
import { fakeBrowser } from "./browser-fakes.ts";

const browser = fakeBrowser();
const browserApp = app().modules(BrowserModule.with(browser.parts)).start();
const host = document.createElement("div");
document.body.append(host);
createRoot(host).render(h(AppProvider, { app: browserApp }, inBrowserPlate()));

await waitFor(() => host.querySelector('[data-plate-place="lead"] button[aria-label="Back"]') !== null);

check(
	"the browser draws no tab of its own: the host tab names the page",
	host.querySelector("[data-browser-tab]"),
	null,
);

function navButton(label: string): HTMLButtonElement | null {
	return host.querySelector(`[data-plate-head="app"] button[aria-label="${label}"]`);
}

check("back is off with no history", navButton("Back")?.getAttribute("aria-disabled"), "true");
check("forward is on", navButton("Forward")?.getAttribute("aria-disabled"), null);
navButton("Back")?.click();
navButton("Forward")?.click();
await waitFor(() => browser.pages.moves.length === 1);
check("the plate header's back and forward move the page, an off one does nothing", browser.pages.moves, ["forward"]);
check(
	"the plate header's crumb reads site / title",
	host.querySelector('[data-plate-place="crumb"] .wg-plate-crumb')?.textContent,
	"example.com/Example board",
);
check("the pages are attached to the page area", browser.pages.attached[0]?.hasAttribute("data-browser-pages"), true);

const reading = browserApp.send(ReadPageContentCommand, { tabId: null });
await reading;
browser.pages.told();
await waitFor(() => host.querySelector("[data-browser-ink-reading]") !== null);
check(
	"a read outlines the page",
	host.querySelector("[data-browser-page-area]")?.className.includes("cv:outline-brand"),
	true,
);
check("and shows the stop pill", host.querySelector("[data-browser-ink-reading]")?.textContent?.includes("Stop"), true);

browser.pages.tab = {
	...browser.pages.tab,
	url: "https://mail.google.com/",
};
browser.pages.told();
const asking = browserApp.send(ReadPageContentCommand, { tabId: null });
await waitFor(() => host.querySelector("[data-browser-ask]") !== null);
check(
	"an ask is drawn over the page",
	host.querySelector("[data-browser-ask] h3")?.textContent,
	"Let Sumi read mail.google.com?",
);
const once = [...host.querySelectorAll<HTMLButtonElement>("[data-browser-ask] button")].find(
	(button) => button.textContent === "Once",
);
once?.click();
const answered = await asking;
check("pressing once lets the read through", answered.ok, true);
check("no label is upper case", /cv:uppercase|text-transform:\s*uppercase/.test(host.innerHTML), false);
