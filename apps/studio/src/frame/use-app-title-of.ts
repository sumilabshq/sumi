import { useQuery } from "@widgetarium/data-framework";
import { apps as appsContract } from "@sumi/apps";
import type { TabApp } from "@widgetarium/app-host";

export type AppTitleOf = (app: TabApp) => string;

export function useAppTitleOf(): AppTitleOf {
	const { apps } = useQuery(appsContract.apps.apps).data;
	return (app) => apps.find(({ id }) => id === app)?.title ?? app;
}
