import type { Runs } from "./module";

export interface Placement<R extends Runs> {
	readonly runs: R;
}

export type OnServer = "server";

type OnDevice = "client";

export type DeviceRuns = OnDevice | "anywhere";

export type ServerRuns = OnServer | "anywhere";

export const Server: Placement<OnServer> = Object.freeze({ runs: "server" });

export const Device: Placement<OnDevice> = Object.freeze({ runs: "client" });

export const Anywhere: Placement<"anywhere"> = Object.freeze({ runs: "anywhere" });
