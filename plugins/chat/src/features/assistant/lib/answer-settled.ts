type Answered = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export async function answerSettled(answering: Promise<Answered>): Promise<void> {
	const answer = await answering;

	if (!answer.ok) {
		throw new Error(answer.reason);
	}
}
