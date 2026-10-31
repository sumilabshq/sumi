import { useQuery } from "@widgetarium/core/requests";
import { AppFacesQuery } from "@widgetarium/app-host";
import type { TabApp } from "@widgetarium/app-host";

export type AppTitleOf = (app: TabApp) => string;

export function useAppTitleOf(): AppTitleOf {
	const { faces } = useQuery(AppFacesQuery).data;
	return (app) => faces.find((face) => face.app === app)?.title ?? app;
}
