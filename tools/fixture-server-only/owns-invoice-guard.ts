import { SERVER_ONLY_SECRET } from "@fixture/billing/module";
import { guard } from "../../packages/shared/framework/src/index.ts";

export const OwnsInvoiceGuard = guard().handle(() =>
	SERVER_ONLY_SECRET.length > 0 ? null : { code: "forbidden", reason: SERVER_ONLY_SECRET },
);
