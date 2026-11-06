import type { PlatformModule } from "@widgetarium/framework";
import type { WebPageModule } from "@widgetarium/web-page/module";

type WebPageHostObjects =
	typeof WebPageModule extends PlatformModule<infer _Parts, infer _Runs, infer Lent> ? Lent : never;

export type NativeWebPages = NonNullable<WebPageHostObjects["nativePages"]>;

export type AppTabs = NonNullable<WebPageHostObjects["webAppTabs"]>;
