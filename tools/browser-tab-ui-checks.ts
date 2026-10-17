import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider, app } from "../packages/core/src/requests/index.ts";
import { BrowserClientModule } from "../packages/browser/generated/module.ts";
import { Browser, BrowserAppZone } from "../packages/browser/generated/index.ts";
import { ReadPageContentCommand } from "../packages/browser/features/ink/contract.ts";
import { check, waitFor } from "./check-helpers.ts";
import { fakeBrowser } from "./browser-fakes.ts";

const browser = fakeBrowser();
const browserApp = app({ modules: [BrowserClientModule.with(browser.parts)] });
const host = document.createElement("div");
document.body.append(host);
createRoot(host).render(h(AppProvider, { app: browserApp }, h(Browser, { header: h(BrowserAppZone) })));

await waitFor(() => host.querySelector("[data-browser-nav]") !== null);

check(
	"the app zone draws no tab of its own: the host tab names the page",
	host.querySelector("[data-browser-tab]"),
	null,
);

function navButton(label: string): HTMLButtonElement | null {
	return host.querySelector(`[data-browser-nav] button[aria-label="${label}"]`);
}

check("back is off with no history", navButton("Back")?.disabled, true);
check("forward is on", navButton("Forward")?.disabled, false);
check("reload is on for a page", navButton("Reload")?.disabled, false);
navButton("Forward")?.click();
navButton("Reload")?.click();
await waitFor(() => browser.pages.moves.length === 2);
check("the nav buttons move the page", browser.pages.moves, ["forward", "reload"]);

const address = host.querySelector<HTMLInputElement>("[data-browser-address] input");
check("the address field shows the page address", address?.value, "https://example.com/board");
check("the access chip says what Ink can see", host.querySelector("[data-browser-access]")?.textContent, "Read only");
check("the pages are attached to the page area", browser.pages.attached[0]?.hasAttribute("data-browser-pages"), true);

const reading = browserApp.send(ReadPageContentCommand);
await reading;
browser.pages.told();
await waitFor(() => host.querySelector('[data-browser-access="reading"]') !== null);
check("a read marks the address field", host.querySelector("[data-browser-access]")?.textContent, "Ink is reading");
check(
	"and outlines the page",
	host.querySelector("[data-browser-page-area]")?.className.includes("cv:outline-brand"),
	true,
);
check("and shows the stop pill", host.querySelector("[data-browser-ink-reading]")?.textContent?.includes("Stop"), true);

browser.pages.tab = {
	...browser.pages.tab,
	url: "https://mail.google.com/",
};
browser.pages.told();
const asking = browserApp.send(ReadPageContentCommand);
await waitFor(() => host.querySelector("[data-browser-ask]") !== null);
check(
	"an ask is drawn over the page",
	host.querySelector("[data-browser-ask] h3")?.textContent,
	"Let Ink read mail.google.com?",
);
const once = [...host.querySelectorAll<HTMLButtonElement>("[data-browser-ask] button")].find(
	(button) => button.textContent === "Once",
);
once?.click();
const answered = await asking;
check("pressing once lets the read through", answered.ok, true);
check("no label is upper case", /cv:uppercase|text-transform:\s*uppercase/.test(host.innerHTML), false);
