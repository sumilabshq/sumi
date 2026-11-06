import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { project } from "virtual:widgetarium/project";
import { startTauriStudio } from "@widgetarium/host-tauri";

const root = document.getElementById("root");

if (root === null) {
	throw new Error("index.html holds no #root to mount the studio in");
}

createRoot(root).render(createElement(StrictMode, null, startTauriStudio(project)));
