import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { catchLinks, wearSumiTheme } from "@sumi/contract";
import { BrowserRoot } from "./browser-root.js";
import { startSumiShell } from "./sumi-shell.js";
import { SumiTab } from "./sumi-tab.js";
import { SumiWebPage } from "./sumi-web-page.js";
import "./styles.css";

const mount = document.getElementById("app");

if (mount === null) {
	throw new Error("index.html has no #app to draw the browser page in");
}

const shell = startSumiShell();
wearSumiTheme({ sumi: shell.app, transport: shell.transport });
catchLinks({ sumi: shell.app, tabId: shell.tabId });
createRoot(mount).render(<BrowserRoot tab={new SumiTab(shell)} page={new SumiWebPage(shell)} />);
