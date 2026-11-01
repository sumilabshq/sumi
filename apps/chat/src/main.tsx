import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { ChatRoot } from "./chat-root.js";
import { startSumiShell } from "./sumi/sumi-shell.js";
import "./styles.css";

const mount = document.getElementById("app");

if (mount === null) {
	throw new Error("index.html has no #app to draw the Chat app in");
}

createRoot(mount).render(<ChatRoot shell={startSumiShell()} />);
