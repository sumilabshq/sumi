import { Authenticate } from "@widgetarium/data-framework";
import type { User } from "@widgetarium/data-framework";

export const APP_CALLER_HEADER = "x-sumi-app";

// TODO: one owner of the app-id schema
const APP_ID = /^[a-z][a-z0-9-]*$/;
const NOT_AN_APP = "the caller header names {app}, which is not an app id; the call is refused";

export class AppCallerAuthenticate extends Authenticate {
	override async userOf(headers: Headers): Promise<User | null> {
		const app = headers.get(APP_CALLER_HEADER);

		if (app === null) {
			return null;
		}

		if (!APP_ID.test(app)) {
			throw new Error(NOT_AN_APP.replace("{app}", JSON.stringify(app)));
		}

		return {
			id: app,
			permissions: [],
		};
	}
}
