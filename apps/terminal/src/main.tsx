import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { portFromParent } from "@widgetarium/core/requests";
import { startSumiShell } from "./sumi-shell.js";
import { OutsideSumi } from "./outside-sumi.js";
import { TerminalRoot } from "./terminal-root.js";
import "./styles.css";

const mount = document.getElementById("app");

if (mount === null) {
	throw new Error("index.html has no #app to draw the Terminal app in");
}

const root = createRoot(mount);
portFromParent().then(
	(port) => root.render(<TerminalRoot sumi={startSumiShell(port)} />),
	() => root.render(<OutsideSumi />),
);
