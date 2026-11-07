import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { ChatQuestionsQuery } from "@sumi/contract";
import type { Report } from "../../../../shared/lib/failure-line.js";
import { useQuestionDoing } from "../../lib/use-question-doing.js";
import { useQueuesAnswers } from "../../lib/use-queues-answers.js";
import { NeededBlock } from "./needed-block.js";
import { OptionalBlock } from "./optional-block.js";

export function QuestionsDock({
  chatId,
  report,
}: {
  readonly chatId: string;
  readonly report: Report;
}): ReactElement | null {
  const { data } = useQuery(ChatQuestionsQuery, { chat: chatId });
  const doing = useQuestionDoing(chatId, report);
  useQueuesAnswers(chatId, data.optional, report);

  if (data.needed.length === 0 && data.optional.length === 0) {
    return null;
  }

  return (
    <div className="wg-questions-dock">
      {data.needed.length === 0 ? null : (
        <NeededBlock questions={data.needed} doing={doing} />
      )}
      {data.optional.length === 0 ? null : (
        <OptionalBlock questions={data.optional} doing={doing} />
      )}
    </div>
  );
}
