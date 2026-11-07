import type { User } from "./guard";

export abstract class Authenticate {
	abstract userOf(headers: Headers): Promise<User | null>;
}
