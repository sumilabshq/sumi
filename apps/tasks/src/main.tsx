import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { OutsideSumi } from "./outside-sumi.js";
import { startSumiFrame } from "./sumi/sumi-frame.js";
import { TasksRoot } from "./tasks-root.js";
import "./styles.css";

const mount = document.getElementById("app");

if (mount === null) {
	throw new Error("index.html has no #app to draw the Tasks app in");
}

const root = createRoot(mount);

startSumiFrame().then(
	(frame) => root.render(<TasksRoot frame={frame} />),
	(refusal: unknown) => {
		console.warn("[tasks] no Sumi above this page", refusal);
		root.render(<OutsideSumi />);
	},
);
