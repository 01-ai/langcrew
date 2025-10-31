import {
  EventPlanChunk,
  KnowledgeBaseItem,
  MCPToolItem,
  MessageChunk,
  MessageItem,
  MessagePlanChunk,
  MessageToolChunk,
  PlanStep,
  PlanUpdateChunk,
  SessionInfo,
  TaskStatus,
} from '@/types';
import { sessionApi } from '@/services/api';
import { cloneDeep } from 'lodash-es';
import { getTranslation } from '../useTranslation';
import { useAgentStore } from '@/store';

export const ignoreToolChunks = [
  'agent_update_plan',
  'agent_advance_phase',
  // 'message_to_user',
  'agent_end_task',
  'config',
  'ask_user',
];

// filter out live_status
function filterLiveStatus(message: MessageItem) {
  message.messages = message.messages
    .filter((msg) => msg.type !== 'live_status')
    .map((msg) => {
      if (isPlanChunk(msg)) {
        const plan = msg as MessagePlanChunk;
        plan.children = plan.children.map((step) => {
          step.children = step.children.filter((child) => child.type !== 'live_status');
          return step;
        });
        return plan;
      }
      return msg;
    });
  return message;
}

// change the status of all steps in all plans to success
function changePlanStepStatusToSuccess(message: MessageItem) {
  message.messages.forEach((msg) => {
    if (isPlanChunk(msg)) {
      (msg as MessagePlanChunk).children.forEach((step: PlanStep) => {
        if (step.status === TaskStatus.Running) {
          step.status = TaskStatus.Success;
        }
      });
    }
  });
  return message;
}

function moveFilesToEnd(message: MessageItem) {
  const filesIndex = message.messages.findLastIndex((msg) => msg.type === 'agent_result_delivery');
  const endIndex = message.messages.findLastIndex(isFinishChunk);

  // if both exist, move the element of filesIndex to the front of endIndex
  if (filesIndex !== -1 && endIndex !== -1) {
    const files = message.messages.splice(filesIndex, 1);
    message.messages.splice(endIndex - 1, 0, ...files);
  }
  // if there is a plan, move the agent_result_delivery in the plan to the front of endIndex
  const plan = message.messages.find(isPlanChunk) as MessagePlanChunk;
  if (plan) {
    const step = plan.children.find((step: PlanStep) =>
      step.children.some((child) => child.type === 'agent_result_delivery'),
    );
    if (step) {
      const filesIndex2 = step.children.findLastIndex((msg) => msg.type === 'agent_result_delivery');
      if (filesIndex2 !== -1) {
        const fileChunk = Object.assign({}, step.children[filesIndex2]);
        step.children.splice(filesIndex2, 1);

        // fix the insertion position logic
        if (endIndex !== -1) {
          // if found the finish chunk, insert it in front of it
          message.messages.splice(endIndex, 0, fileChunk);
        } else {
          // if not found the finish chunk, add it to the end
          message.messages.push(fileChunk);
        }
      }
    }
  }
  return message;
}

export function isPlanChunk(message: MessageChunk) {
  return message.type === 'plan';
}

export const getLoadingMessage = () => {
  return {
    role: 'assistant',
    messages: [
      {
        type: 'live_status',
        content: getTranslation('chatbot.task.thinking'),
      },
    ],
  } as MessageItem;
};

function removeIsLast(message: MessageItem) {
  message.messages = message.messages.map((msg) => {
    if (msg.isLast !== undefined) {
      delete msg.isLast;
    }
    if (msg.type === 'plan') {
      (msg as MessagePlanChunk).children?.forEach((step) => {
        step.children?.forEach((child) => {
          if (child.isLast !== undefined) {
            delete child.isLast;
          }
        });
      });
    }
    return msg;
  });
  return message;
}

function isPair(toolCallChunk: MessageToolChunk, toolResultChunk: MessageToolChunk) {
  if (
    toolCallChunk?.type !== toolResultChunk?.detail?.tool &&
    toolCallChunk?.detail?.tool !== toolResultChunk?.detail?.tool
  ) {
    return false;
  }
  if (
    toolCallChunk?.detail?.param?.tool_id &&
    toolResultChunk?.detail?.result?.tool_use_id &&
    toolCallChunk?.detail?.param?.tool_id === toolResultChunk?.detail?.result?.tool_use_id
  ) {
    return true;
  }
  if (
    toolCallChunk?.detail?.run_id &&
    toolResultChunk?.detail?.run_id &&
    toolCallChunk?.detail?.run_id === toolResultChunk?.detail?.run_id
  ) {
    return true;
  }
  return false;
}

export const transformChunksToMessages = (chunks: MessageChunk[], existingMessages: MessageItem[] = []) => {
  // create a deep copy of chunks, avoid modifying the original data
  // use lodash cloneDeep for high-performance deep copy
  const chunksCopy = cloneDeep(chunks);
  // the messages to return
  const newMessages: MessageItem[] = existingMessages.slice();

  // the current AI message
  let currentAIMessage: MessageItem | undefined = newMessages.findLast((msg) => msg.role === 'assistant');

  const existingAIMessage = !!currentAIMessage;

  // the last live_status, other live_statuss are not displayed
  const latestLiveStatusChunk = chunksCopy
    .slice()
    .reverse()
    .find((chunk) => chunk.type === 'live_status');

  for (let i = 0; i < chunksCopy.length; i++) {
    // the current chunk
    const chunk = chunksCopy[i];

    const futureChunks = chunksCopy.slice(i + 1);
    const hasUserMessage = futureChunks.some((chunk) => chunk.role === 'user');

    if (!hasUserMessage && chunk.role === 'assistant') {
      chunk.isLast = true;
    }

    // ignore certain specific tool calls
    if (ignoreToolChunks.includes((chunk as MessageToolChunk).detail?.tool) || ignoreToolChunks.includes(chunk.type)) {
      continue;
    }

    // user message - check if it is a new round of conversation
    if (chunk.role === 'user') {
      // if there is a current AI message, save it first
      if (currentAIMessage) {
        // if currentAIMessage has ended, filter out live_status, and change the status of the running steps in the plan to success, and hide the steps that have not started

        currentAIMessage = filterLiveStatus(currentAIMessage);
        currentAIMessage = changePlanStepStatusToSuccess(currentAIMessage);
        if (!existingAIMessage) {
          // remove isLast from the current AI message before adding it to the newMessages
          currentAIMessage = removeIsLast(currentAIMessage);
          newMessages.push(currentAIMessage);
          useAgentStore.getState().onNewMessage?.(currentAIMessage);
        }
        currentAIMessage = null;
      }

      // add user message
      newMessages.push({
        role: 'user',
        messages: [chunk],
      });
      continue;
    }
    // if there is no current AI message, create one
    if (!currentAIMessage) {
      currentAIMessage = {
        role: 'assistant',
        messages: [],
      };
    }

    // if the chunk has a trace_id, add it to the current AI message
    if (chunk.trace_id && currentAIMessage) {
      currentAIMessage.trace_id = chunk.trace_id;
    }

    // handle live_status
    if (chunk.type === 'live_status') {
      // only handle the last one
      if (chunk.id === latestLiveStatusChunk?.id) {
        // find the plan
        const latestPlan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
        // if there is a plan
        if (latestPlan) {
          // if there is a running step, add it to the step, otherwise add it to the messages
          const step = latestPlan.children.find((step: PlanStep) => step.status === 'running') as PlanStep;
          if (step) {
            step.children.push(chunk);
            continue;
          }
        }
        // if there is no plan or no running step, add it to the messages
        currentAIMessage.messages.push(chunk);
      }
      // other ones are not handled, and the current loop is exited
      continue;
    }

    // handle plan
    if (isPlanChunk(chunk)) {
      const existingPlan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
      if (existingPlan) {
        planMerge(existingPlan, chunk as EventPlanChunk);
      } else {
        currentAIMessage = filterLiveStatus(currentAIMessage);
        currentAIMessage.messages.push(handlePlanChunk(chunk as EventPlanChunk));
      }
      continue;
    }

    // handle plan_update
    if (chunk.type === 'plan_update') {
      // specify chunk is PlanUpdateChunk
      const planUpdateChunk = chunk as PlanUpdateChunk;
      // find the existing plan
      const plan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
      if (plan) {
        handlePlanUpdateChunk(plan, planUpdateChunk);
      }
      // after handling, exit the current loop
      continue;
    }

    // no tool and has run_id: try to merge the items with same run_id
    if (!chunk.detail?.tool && !!chunk.detail?.run_id) {
      // the first item with same run_id
      const firstRunIndex = chunksCopy.findIndex((c) => c.detail?.run_id === chunk.detail?.run_id);
      // find all items with same run_id
      const items = chunksCopy.filter((c) => c.detail?.run_id === chunk.detail?.run_id);
      // if this is the first item with same run_id
      if (items.length > 1) {
        if (firstRunIndex === i) {
          chunk.content = items.map((c) => c.content).join('');
        } else {
          // skip items not the first
          continue;
        }
      }
    }

    // handle tool_call - check if the next one is tool_result
    if (chunk.type === 'tool_call') {
      // specify chunk is MessageToolChunk
      const toolCallChunk = chunk as MessageToolChunk;
      // specify chunk's type is tool
      chunk.type = toolCallChunk.detail.tool;
    }
    if (chunk.type === 'tool_result') {
      const toolCallChunk = currentAIMessage.messages.findLast((ck) =>
        isPair(ck as MessageToolChunk, chunk as MessageToolChunk),
      );
      // merge tool_call and tool_result
      if (toolCallChunk) {
        toolCallChunk.id = chunk.id;
        toolCallChunk.timestamp = chunk.timestamp;
        toolCallChunk.detail = {
          ...chunk.detail,
          param: toolCallChunk.detail.param,
          action: toolCallChunk.detail.action,
          action_content: toolCallChunk.detail.action_content,
        };
        continue;
      }
      // find in plan if not found in messages
      const plan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
      if (plan) {
        const step = plan.children.find((step: PlanStep) =>
          step.children.some((child) => isPair(child as MessageToolChunk, chunk as MessageToolChunk)),
        );
        if (step) {
          const toolCallChunk = step.children.findLast((child) =>
            isPair(child as MessageToolChunk, chunk as MessageToolChunk),
          );
          if (toolCallChunk) {
            toolCallChunk.id = chunk.id;
            toolCallChunk.timestamp = chunk.timestamp;
            toolCallChunk.detail = {
              ...chunk.detail,
              param: toolCallChunk.detail.param,
              action: toolCallChunk.detail.action,
              action_content: toolCallChunk.detail.action_content,
            };
            continue;
          }
        }
      }
      const toolResultChunk = chunk as MessageToolChunk;
      chunk.type = toolResultChunk.detail.tool;
    }

    if (chunk.type === 'user_input') {
      currentAIMessage = filterLiveStatus(currentAIMessage);
      currentAIMessage.messages.push(chunk);
      continue;
    }

    if (isFinishChunk(chunk)) {
      currentAIMessage = filterLiveStatus(currentAIMessage);
      currentAIMessage.messages.push(chunk);
      // currentAIMessage = moveFilesToEnd(currentAIMessage);
      continue;
    }

    const plan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
    // handle ordinary, if there is step_id, add it to the step, otherwise add it to the messages
    if (chunk.step_id) {
      if (plan) {
        const step = plan.children.find((step: PlanStep) => step.id === chunk.step_id);
        if (step) {
          // if there is a liveStatus in the current step, remove it
          step.children = step.children.filter((child) => child.type !== 'live_status');
          step.children.push(chunk);
          continue;
        }
      }
    }
    // if there is no step_id, check if there is a running step
    if (plan) {
      const step = plan.children.find((step: PlanStep) => step.status === 'running');
      if (step) {
        const lastItem = step.children[step.children.length - 1];
        // merge tool_call and tool_result
        if (
          lastItem &&
          isPair(lastItem as MessageToolChunk, chunk as MessageToolChunk) &&
          (chunk.detail?.status === 'success' || chunk.detail?.status !== 'pending')
        ) {
          lastItem.id = chunk.id;
          lastItem.detail = {
            ...chunk.detail,
            param: lastItem.detail.param,
            action: lastItem.detail.action,
            action_content: lastItem.detail.action_content,
          };
          continue;
        }
        // run_id and type are the same, merge, avoid tool_call and tool_result merge
        if (
          !!lastItem?.detail?.run_id &&
          lastItem?.detail?.run_id === chunk.detail?.run_id &&
          lastItem?.type === chunk.type &&
          !lastItem?.detail?.tool &&
          !chunk?.detail?.tool
        ) {
          lastItem.content += chunk.content;

          continue;
        }
        step.children.push(chunk);
        continue;
      }
    }

    // if there is no step_id, add it to the messages
    currentAIMessage = filterLiveStatus(currentAIMessage);
    const lastItem = currentAIMessage.messages[currentAIMessage.messages.length - 1];

    // run_id and type are the same, merge, avoid tool_call and tool_result merge
    if (
      !!lastItem?.detail?.run_id &&
      lastItem?.detail?.run_id === chunk.detail?.run_id &&
      lastItem?.type === chunk.type &&
      !chunk.detail?.tool &&
      !lastItem.detail?.tool
    ) {
      lastItem.content += chunk.content;
    } else {
      currentAIMessage.messages.push(chunk);
    }
    continue;
  }

  if (currentAIMessage) {
    if (isMessageFinish(currentAIMessage)) {
      useAgentStore.getState().onNewMessage?.(currentAIMessage);
      currentAIMessage = filterLiveStatus(currentAIMessage);
      currentAIMessage = changePlanStepStatusToSuccess(currentAIMessage);
    }
    if (!existingAIMessage) {
      newMessages.push(currentAIMessage);
    }
  }

  // if the last item is user message, add a live_status
  if (newMessages[newMessages.length - 1]?.role === 'user') {
    newMessages.push(getLoadingMessage());
  }

  return newMessages;
};

function handlePlanChunk(chunk: EventPlanChunk) {
  const plan = {
    ...chunk,
    children: chunk.detail.steps.map(stepMapper),
  };
  return plan as MessagePlanChunk;
}

function handlePlanUpdateChunk(plan: MessagePlanChunk, planUpdateChunk: PlanUpdateChunk) {
  // if the action is add, add it directly
  if (planUpdateChunk.detail?.action === 'add') {
    // if detail.steps is empty, assign it directly
    if (!plan.children) {
      plan.children = planUpdateChunk.detail.steps.map(stepMapper);
    } else {
      // otherwise merge
      plan.children.push(...planUpdateChunk.detail.steps.map(stepMapper));
    }
  }
  // if the action is update, update it
  if (planUpdateChunk.detail?.action === 'update') {
    planUpdateChunk.detail?.steps?.forEach((newStep) => {
      // find the corresponding step
      const index = plan.children.findIndex((step: PlanStep) => step.id === newStep.id);
      // if found, update it
      if (index !== -1) {
        // merge
        plan.children[index] = {
          ...plan.children[index],
          ...newStep,
        };
      }
    });
  }
  // if the action is remove, delete it
  if (planUpdateChunk.detail?.action === 'remove') {
    planUpdateChunk.detail?.steps?.forEach((newStep) => {
      // find the corresponding step
      const index = plan.children.findIndex((step: PlanStep) => step.id === newStep.id);
      // if found, delete it
      if (index !== -1) {
        plan.children.splice(index, 1);
      }
    });
  }
  return plan;
}

// merge plan
function planMerge(existingPlan: MessagePlanChunk, newPlan: EventPlanChunk) {
  newPlan.detail?.steps?.forEach((step) => {
    const index = existingPlan.children.findIndex((s) => s.id === step.id);
    if (index !== -1) {
      existingPlan.children[index] = {
        ...existingPlan.children[index],
        ...step,
      };
    }
  });
  return existingPlan;
}

export const getPlan = (chunks: MessageChunk[]) => {
  const lastUserMessageIndex = chunks.findLastIndex((chunk) => chunk.role === 'user');
  if (lastUserMessageIndex === -1) {
    return null;
  }
  const aiChunks = chunks.slice(lastUserMessageIndex + 1);
  const planChunks = aiChunks.filter((chunk) => isPlanChunk(chunk) || chunk.type === 'plan_update');
  let plan: MessagePlanChunk | null = null;
  for (const chunk of planChunks) {
    if (isPlanChunk(chunk)) {
      plan = handlePlanChunk(chunk as EventPlanChunk);
    }
    if (chunk.type === 'plan_update' && plan) {
      const planUpdateChunk = chunk as PlanUpdateChunk;
      plan = handlePlanUpdateChunk(plan, planUpdateChunk);
    }
  }
  if (aiChunks.some((chunk) => isFinishChunk(chunk)) && plan) {
    plan.children.forEach((step) => {
      if (step.status === TaskStatus.Running) {
        step.status = TaskStatus.Success;
      }
    });
  }
  return plan;
};

export const isMessageFinish = (message: MessageItem) => {
  return message.messages.some((msg) => isFinishChunk(msg));
};

export function isFinishChunk(chunk: MessageChunk) {
  return chunk.type === 'agent_end_task' || chunk.type === 'error' || chunk.type === 'finish_reason';
}

/**
 * add children to step
 * @param step
 * @returns
 */
const stepMapper = (step: PlanStep) => {
  return {
    ...step,
    children: [],
  };
};

/**
 * check if it is a tool message
 * @param chunk message body
 * @returns whether it is a tool message
 */
export const isToolMessage = (chunk: MessageToolChunk) => {
  return !!chunk.detail?.tool && chunk.detail?.tool !== 'agent_end_task';
};
