import { refusalOf } from "./answer";
import type { Answer } from "./answer";
import type { AdapterOptions } from "./exposure";
import type { RemoteCall } from "./remote-server";
import type { Runtime } from "./runtime";
import { throwIfRefused } from "./throw-if-refused";
import { ChangeBroadcast } from "./transport";
import type { Answering, HearChanges, RemoteTransport } from "./transport";

const NOT_SERVING = "{name}: no runtime is served on this local transport yet";
const ADAPTER = "localTransport().serve()";
const SERVED_ALREADY = "a runtime is served on this local transport already: stop it first";

export class LocalTransport implements RemoteTransport {
	private serving: Answering | null = null;
	private readonly heard = new ChangeBroadcast();

	serve(runtime: Runtime, { authenticate }: AdapterOptions = {}): () => void {
		throwIfRefused(ADAPTER, this.serving === null ? [] : [SERVED_ALREADY]);
		const exposed = runtime.expose({ adapter: ADAPTER, authenticate });
		this.serving = exposed;
		const stopHearing = exposed.changes((invalidated) => this.heard.tell(invalidated));
		return () => {
			stopHearing();

			if (this.serving === exposed) {
				this.serving = null;
			}
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
