import { refusalOf } from "./answer";
import type { Answer } from "./answer";
import type { RemoteCall } from "./remote-server";
import { ChangeBroadcast } from "./transport";
import type { HearChanges, ListeningTransport, RemoteTransport, ServingServer } from "./transport";

const NOT_SERVING = "{name}: no server listens on this local transport yet";

export class LocalTransport implements RemoteTransport, ListeningTransport {
	private serving: ServingServer | null = null;
	private readonly heard = new ChangeBroadcast();

	serve(server: ServingServer): () => void {
		this.serving = server;
		const stopHearing = server.changes((invalidated) => this.heard.tell(invalidated));
		return () => {
			stopHearing();
			this.serving = null;
		};
	}

	call({ request, sent, idempotencyKey, signal, headers }: RemoteCall): Promise<Answer<unknown>> {
		if (this.serving === null) {
			return Promise.resolve(refusalOf("unreachable", NOT_SERVING.replace("{name}", request.name)));
		}

		return this.serving.answer({ name: request.name, input: sent, idempotencyKey, signal, headers });
	}

	changes(hear: HearChanges): () => void {
		return this.heard.hear(hear);
	}
}

export function localTransport(): LocalTransport {
	return new LocalTransport();
}
