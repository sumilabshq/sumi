import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { HomePage } from "../ui/home-page/home-page.js";

export const HOME_APP = "home";

export const homeTabPage: DrawnTabPage = {
	page: HomePage,
	header: "none",
	draws: (app) => app === HOME_APP,
	modulesOf: () =>
		Promise.resolve({
			modules: [],
			imports: [],
		}),
};
