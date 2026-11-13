import { refuse } from "@widgetarium/data-framework";
import type { User } from "@widgetarium/data-framework";

const NO_APP = "only an app has a terminal: the call carries no app";
const KEY_OF_APP = "{app}:{name}";

export function ownedKeyOf(user: User | null, name: string): string {
	if (user === null) {
		return refuse(NO_APP);
	}

	return KEY_OF_APP.replace("{app}", user.id).replace("{name}", name);
}
