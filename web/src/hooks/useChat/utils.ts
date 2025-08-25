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

export const ignoreToolChunks = [
  'agent_update_plan',
  'agent_advance_phase',
  // 'message_to_user',
  'agent_end_task',
  'config',
  'ask_user',
];

// 过滤掉live_status
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

// 把所有plan里的所有step的status都改成success
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

// 没开始的step不显示
function hideFutureSteps(message: MessageItem) {
  message.messages.forEach((msg) => {
    if (isPlanChunk(msg)) {
      (msg as MessagePlanChunk).children = (msg as MessagePlanChunk).children.filter((step: PlanStep) => {
        return step.status === TaskStatus.Success || step.status === TaskStatus.Running;
      });
    }
  });
  return message;
}

// 没children的step不显示
function hideEmptySteps(message: MessageItem) {
  message.messages.forEach((msg) => {
    if (isPlanChunk(msg)) {
      (msg as MessagePlanChunk).children = (msg as MessagePlanChunk).children.filter(
        (step: PlanStep) => step.children.length > 0,
      );
    }
  });
  return message;
}

export function isPlanChunk(message: MessageChunk) {
  return message.type === 'plan';
}

export const transformChunksToMessages = (chunks: MessageChunk[]) => {
  // 创建 chunks 的深拷贝，避免修改原始数据
  // 使用 lodash cloneDeep 进行高性能深拷贝
  const chunksCopy = cloneDeep(chunks);
  // 要返回的
  const newMessages: MessageItem[] = [];

  // 当前的AI消息
  let currentAIMessage: MessageItem | null = null;

  // 最后一个live_status，别的live_status不显示
  const latestLiveStatusChunk = chunksCopy
    .slice()
    .reverse()
    .find((chunk) => chunk.type === 'live_status');

  for (let i = 0; i < chunksCopy.length; i++) {
    // 当前的chunk
    const chunk = chunksCopy[i];

    const futureChunks = chunksCopy.slice(i + 1);
    const hasUserMessage = futureChunks.some((chunk) => chunk.role === 'user');

    chunk.isLast = !hasUserMessage;

    // 忽略某些特定工具调用
    if (ignoreToolChunks.includes((chunk as MessageToolChunk).detail?.tool) || ignoreToolChunks.includes(chunk.type)) {
      continue;
    }

    // 用户消息 - 检查是否是新的一轮对话
    if (chunk.role === 'user') {
      // 如果当前有AI消息，则先保存
      if (currentAIMessage) {
        // 如果currentAIMessage已结束，则过滤掉live_status，并把plan里running的step的status改成success，并隐藏未开始的step

        currentAIMessage = filterLiveStatus(currentAIMessage);
        currentAIMessage = changePlanStepStatusToSuccess(currentAIMessage);
        currentAIMessage = hideFutureSteps(currentAIMessage);
        currentAIMessage = hideEmptySteps(currentAIMessage);
        newMessages.push(currentAIMessage);
        currentAIMessage = null;
      }

      // 添加用户消息
      newMessages.push({
        role: 'user',
        messages: [chunk],
      });
      continue;
    }
    // 如果当前没有AI消息，则创建一个
    if (!currentAIMessage) {
      currentAIMessage = {
        role: 'assistant',
        messages: [],
      };
    }

    // 处理live_status
    if (chunk.type === 'live_status') {
      // 只处理最后一个
      if (chunk.id === latestLiveStatusChunk?.id) {
        // 找到plan
        const latestPlan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
        // 如果有plan
        if (latestPlan) {
          // 有未完成的step，就加在step中，不然加在messages中
          const step = latestPlan.children.find((step: PlanStep) => step.status === 'running') as PlanStep;
          if (step) {
            step.children.push(chunk);
            continue;
          }
        }
        // 没有plan或者没有未完成的step，就加在messages中
        currentAIMessage.messages.push(chunk);
      }
      // 其他的不处理，且跳出本次循环
      continue;
    }

    // 处理plan
    if (isPlanChunk(chunk)) {
      currentAIMessage = filterLiveStatus(currentAIMessage);
      currentAIMessage.messages.push(handlePlanChunk(chunk as EventPlanChunk));
      continue;
    }

    // plan_update处理
    if (chunk.type === 'plan_update') {
      // 指定chunk是PlanUpdateChunk
      const planUpdateChunk = chunk as PlanUpdateChunk;
      // 找到已有plan
      const plan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
      if (plan) {
        handlePlanUpdateChunk(plan, planUpdateChunk);
      }
      // 处理完就跳出本次循环
      continue;
    }

    // tool_call处理 - 检查下一条是否为tool_result
    if (chunk.type === 'tool_call') {
      // 指定chunk是MessageToolChunk
      const toolCallChunk = chunk as MessageToolChunk;
      // 指定chunk的type为tool
      chunk.type = toolCallChunk.detail.tool;
      // 如果有一条tool_result的run_id和tool_call的run_id相同，则跳过tool_call
      const toolResultChunk = chunksCopy.find(
        (resultChunk) =>
          resultChunk.type === 'tool_result' && resultChunk.detail?.run_id === toolCallChunk.detail?.run_id,
      );
      if (toolResultChunk) {
        // 更新toolResultChunk的detail，把tool_call的param赋值给tool_result
        toolResultChunk.content = toolCallChunk.content;
        toolResultChunk.detail = {
          ...toolResultChunk.detail,
          param: toolCallChunk.detail.param,
          action: toolCallChunk.detail.action,
          action_content: toolCallChunk.detail.action_content,
        };
        continue;
      }

      // 否则保留tool_call

      // 这里不执行操作，留给下面处理
    }
    if (chunk.type === 'tool_result') {
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
      continue;
    }

    if (chunk.type !== 'tool_call' && chunk.type !== 'tool_result' && !!chunk.detail?.run_id) {
      // the first item with same run_id
      const firstRunIndex = chunksCopy.findIndex((c) => c.detail?.run_id === chunk.detail?.run_id);
      // if this is the first item with same run_id
      if (firstRunIndex === i) {
        // find all items with same run_id
        const items = chunksCopy.filter((c) => c.detail?.run_id === chunk.detail?.run_id);
        chunk.content = items.map((c) => c.content).join('');
      } else {
        // skip items not the first
        continue;
      }
    }

    const plan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
    // 处理普通的，如果有step_id，则添加到step中，不然加到messages中
    if (chunk.step_id) {
      if (plan) {
        const step = plan.children.find((step: PlanStep) => step.id === chunk.step_id);
        if (step) {
          // 如果当前step里有liveStatus，则干掉liveStatus
          step.children = step.children.filter((child) => child.type !== 'live_status');
          step.children.push(chunk);
          continue;
        }
      }
    }
    // 没有step_id的，看看有没有running的step
    if (plan) {
      const step = plan.children.find((step: PlanStep) => step.status === 'running');
      if (step) {
        step.children.push(chunk);
        continue;
      }
    }

    // 没有step_id，则添加到messages中
    currentAIMessage = filterLiveStatus(currentAIMessage);
    currentAIMessage.messages.push(chunk);
    continue;
  }

  if (currentAIMessage) {
    if (isMessageFinish(currentAIMessage)) {
      currentAIMessage = filterLiveStatus(currentAIMessage);
      currentAIMessage = changePlanStepStatusToSuccess(currentAIMessage);
    }
    currentAIMessage = hideFutureSteps(currentAIMessage);
    currentAIMessage = hideEmptySteps(currentAIMessage);
    newMessages.push(currentAIMessage);
  }

  // 如果最后一条是user，则添加一个live_status，用于显示任务执行中
  if (newMessages[newMessages.length - 1]?.role === 'user') {
    newMessages.push({
      role: 'assistant',
      messages: [
        {
          type: 'live_status',
          content: getTranslation('chatbot.task.thinking'),
        },
      ],
    });
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
  // 如果action是add，则直接添加
  if (planUpdateChunk.detail?.action === 'add') {
    // 如果detail.steps为空，则直接赋值
    if (!plan.children) {
      plan.children = planUpdateChunk.detail.steps.map(stepMapper);
    } else {
      // 否则合并
      plan.children.push(...planUpdateChunk.detail.steps.map(stepMapper));
    }
  }
  // 如果action是update，则更新
  if (planUpdateChunk.detail?.action === 'update') {
    planUpdateChunk.detail?.steps?.forEach((newStep) => {
      // 找到对应的step
      const index = plan.children.findIndex((step: PlanStep) => step.id === newStep.id);
      // 如果找到，则更新
      if (index !== -1) {
        // 合并
        plan.children[index] = {
          ...plan.children[index],
          ...newStep,
        };
      }
    });
  }
  // 如果action是remove，则删除
  if (planUpdateChunk.detail?.action === 'remove') {
    planUpdateChunk.detail?.steps?.forEach((newStep) => {
      // 找到对应的step
      const index = plan.children.findIndex((step: PlanStep) => step.id === newStep.id);
      // 如果找到，则删除
      if (index !== -1) {
        plan.children.splice(index, 1);
      }
    });
  }
  return plan;
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
 * 给step添加children
 * @param step
 * @returns
 */
const stepMapper = (step: PlanStep) => {
  return {
    ...step,
    children: [],
  };
};

export const createSession = async ({
  content,
  kb_ids,
  agent_tool_items,
  super_employee_id,
}: {
  content: string;
  kb_ids: string[];
  agent_tool_items: { agent_tool_id: string; agent_tool_type: string }[];
  super_employee_id: string;
}) => {
  try {
    const response = await sessionApi.create({
      content,
      kb_info: {
        kb_ids,
      },
      agent_tool_info: {
        agent_tool_items,
      },
      super_employee_id,
    });
    return response.data as SessionInfo;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
};

export const getSession = async (conversation_id: string) => {
  try {
    const response = await sessionApi.getDetail(conversation_id);
    return response.data;
  } catch (error) {
    console.error('Failed to get session:', error);
    throw error;
  }
};

/**
 * 判断是否是工具消息
 * @param chunk 消息体
 * @returns 是否是工具消息
 */
export const isToolMessage = (chunk: MessageToolChunk) => {
  return !!chunk.detail?.tool && chunk.detail?.tool !== 'agent_end_task';
};
