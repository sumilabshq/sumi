import { homePages as homePagesContract } from "@sumi/home-pages/contract";
import { homePages as homePagesModule } from "@sumi/home-pages/implementation";
import { commandMenu } from "@sumi/command-menu-plugin";
import { backend } from "@sumi/sumi-host-plugin";
import { plugin } from "@widgetarium/plugin-framework";
import type { FilledHomePage } from "./features/home-pages/lib/filled-home-page.js";
import { chosenHomeOf } from "./features/home-pages/ui/chosen-home/chosen-home.js";

export const homePages = plugin("home-pages")
	.require(backend, commandMenu)
	.apply((app) => {
		const filled: FilledHomePage[] = [];
		app
			.use(backend)
			.moduleOf(
				({ store }) => homePagesModule({ store, pages: filled.map(({ id, title }) => ({ id, title })) }),
				homePagesContract,
			);
		app.use(commandMenu).slots.home.replace(chosenHomeOf(filled));
		return {
			page: (page: FilledHomePage): void => {
				filled.push(page);
			},
		};
	});
