import type { User } from "@widgetarium/core/requests";
import { Authenticate } from "@widgetarium/core/requests/server";

export const APP_CALLER_HEADER = "x-sumi-app";

const APP_ID = /^[a-z][a-z0-9-]*$/;

export class AppCallerAuthenticate extends Authenticate {
	override userOf(headers: Headers): Promise<User | null> {
		const app = headers.get(APP_CALLER_HEADER);

		if (app === null || !APP_ID.test(app)) {
			return Promise.resolve(null);
		}

		return Promise.resolve({
			id: app,
			permissions: [],
		});
	}
}
