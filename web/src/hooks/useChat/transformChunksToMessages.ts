import {
  ChatkitWidgetChunkDetail,
  MessageChunk,
  MessageItem,
  MessagePlanChunk,
  MessageToolChunk,
  PlanStep,
  WidgetComponent,
} from '@/types';
import { cloneDeep } from 'lodash-es';
import { mergeCitationSources } from '@/features/citation/utils/citation';

// Import internal helpers from submodules

import {
  ignoreToolChunks,
  filterLiveStatus,
  changePlanStepStatusToSuccess,
  removeIsLast,
  getLoadingMessage,
  isFinishChunk,
  isPlanChunk,
  handlePlanChunk,
  handlePlanUpdateChunk,
  planMerge,
  findComponentInWidget,
  isPair,
  isMessageFinish,
} from './utils';

const getChunkResponseId = (chunk: MessageChunk): string | undefined => {
  return typeof chunk.response_id === 'string' && chunk.response_id ? chunk.response_id : undefined;
};

const applyTraceToMessage = (chunk: MessageChunk, message: MessageItem) => {
  if (chunk.trace_id) {
    message.trace_id = chunk.trace_id;
  }
  const responseId = getChunkResponseId(chunk);
  if (responseId && !message.responseId) {
    message.responseId = responseId;
  }
  const citationSources = mergeCitationSources(
    chunk.citations,
    chunk.detail?.citation_sources,
  );
  if (citationSources.length) {
    message.citations = mergeCitationSources(message.citations, citationSources);
  }
};

const isDuplicateChunkId = (message: MessageItem, chunk: MessageChunk): boolean => {
  if (chunk.id == null || chunk.id === '') {
    return false;
  }
  if (message.messages.some((msg) => msg.id === chunk.id)) {
    return true;
  }
  for (const msg of message.messages) {
    if (!isPlanChunk(msg)) {
      continue;
    }
    for (const step of (msg as MessagePlanChunk).children || []) {
      if (step.children?.some((child) => child.id === chunk.id)) {
        return true;
      }
    }
  }
  return false;
};

export const transformChunksToMessages = (chunks: MessageChunk[], existingMessages: MessageItem[] = []) => {
  // Deep-copy chunks so originals stay intact
  // Deep-clone with lodash cloneDeep
  // Drop live_status chunks whose content is Processing...
  const chunksCopy = cloneDeep(
    chunks.filter((chunk) => chunk.type !== 'live_status' || chunk.content !== 'Processing...'),
  );
  // Return value
  const newMessages: MessageItem[] = existingMessages.slice();

  // Current AI message (mutate this)
  let currentAIMessage: MessageItem | undefined = newMessages.findLast((msg) => msg.role === 'assistant');
  let currentAIMessageAlreadyInList = !!currentAIMessage;

  const finalizeCurrentAssistant = () => {
    if (!currentAIMessage) {
      return;
    }
    currentAIMessage = filterLiveStatus(currentAIMessage);
    currentAIMessage = changePlanStepStatusToSuccess(currentAIMessage);
    currentAIMessage = removeIsLast(currentAIMessage);
    if (!currentAIMessageAlreadyInList) {
      newMessages.push(currentAIMessage);
    }
  };

  const ensureAssistantMessage = (chunk: MessageChunk) => {
    const responseId = getChunkResponseId(chunk);
    if (currentAIMessage && responseId && currentAIMessage.responseId && currentAIMessage.responseId !== responseId) {
      finalizeCurrentAssistant();
      currentAIMessage = {
        role: 'assistant',
        messages: [],
      };
      currentAIMessageAlreadyInList = false;
    }
    if (!currentAIMessage) {
      currentAIMessage = {
        role: 'assistant',
        messages: [],
      };
      currentAIMessageAlreadyInList = false;
    }
    applyTraceToMessage(chunk, currentAIMessage);
  };

  // Show only the last live_status
  const latestLiveStatusChunk = chunksCopy
    .slice()
    .reverse()
    .find((chunk) => chunk.type === 'live_status');

  for (let i = 0; i < chunksCopy.length; i++) {
    // Current chunk
    const chunk = chunksCopy[i];

    // Chunks after the current one
    const futureChunks = chunksCopy.slice(i + 1);
    // Whether a later chunk is a user message
    const hasUserMessage = futureChunks.some((chunk) => chunk.role === 'user');

    // No later user message means this chunk is the last turn
    if (!hasUserMessage && chunk.role === 'assistant') {
      chunk.isLast = true;
    }

    // =============== check if the chunk is a ChatKit type ===============
    const isChatkitChunk = chunk.type === 'widget';

    if (isChatkitChunk) {
      // ─────────────── ChatKit event handling ───────────────
      const eventData = chunk.detail as ChatkitWidgetChunkDetail;
      if (!eventData) continue;

      ensureAssistantMessage(chunk);
      if (!currentAIMessage) {
        continue;
      }

      // item added - add it to the current AI message
      if (eventData.type === 'added') {
        console.log('item added', eventData);

        currentAIMessage.messages.push(chunk);
        continue;
      }

      // item done - update the existing assistant message
      if (eventData.type === 'done') {
        // console.log('item done', eventData);
        const updateItem = currentAIMessage?.messages.find((msg) => msg.detail?.item_id === eventData.item_id);
        // console.log('updateItem', updateItem);
        if (updateItem) {
          console.log('item found, update it');
          updateItem.detail = {
            ...updateItem.detail,
            ...eventData,
          };
        } else {
          // console.log('item not found, add it to the current AI message');

          currentAIMessage.messages.push(chunk);
        }
        continue;
      }

      // item updated - update the existing assistant message
      if (eventData.type === 'update') {
        console.log('item updated', eventData);
        // [api-extractor] Internal Error: Unable to determine semantic information for declaration:
        // const { update_type } = eventData;
        const update_type = eventData?.update_type;
        if (update_type === 'streaming_text_delta') {
          // [api-extractor] Internal Error: Unable to determine semantic information for declaration:
          // const { component_id, delta, done, item_id } = eventData;
          const component_id = eventData?.component_id;
          const item_id = eventData?.item_id;
          const delta = eventData?.delta;
          console.log('streaming_text_delta', delta);
          const updateItem = currentAIMessage?.messages.find((msg) => msg.detail?.item_id === item_id);
          console.log('streaming_text_delta updateItem', updateItem);
          if (updateItem && component_id) {
            console.log(
              'streaming_text_delta updateItem found, find the component',
              updateItem.detail.widget,
              component_id,
            );
            // Walk updateItem.detail.widget.children for the component_id
            const component: WidgetComponent = findComponentInWidget(updateItem.detail.widget, component_id);
            if (component) {
              console.log('streaming_text_delta updateItem found, update the component');
              component.value += delta;
            } else {
              console.log('streaming_text_delta updateItem found, but the component not found');
            }
          }
        }
        if (update_type === 'root_updated') {
          const updateItem = currentAIMessage?.messages.find((msg) => msg.detail?.item_id === eventData.item_id);
          console.log('updateItem', updateItem);
          if (updateItem) {
            console.log('item found, update it');
            updateItem.detail = {
              ...updateItem.detail,
              ...eventData,
            };
          } else {
            console.log('item not found, add it to the current AI message');
            currentAIMessage.messages.push(chunk);
          }
        }
        continue;
      }

      // item removed - remove the existing assistant message
      if (eventData.type === 'removed') {
        console.log('item removed', eventData);
        const removeItem = currentAIMessage?.messages.find((msg) => msg.detail?.item_id === eventData.item_id);
        if (removeItem) {
          console.log('item found, remove it');
          currentAIMessage.messages = currentAIMessage.messages.filter(
            (msg) => msg.detail?.item_id !== eventData.item_id,
          );
        } else {
          console.log('[removed] item not found, do nothing');
        }
        continue;
      }

      // item replaced - replace the existing assistant message
      if (eventData.type === 'replaced') {
        console.log('item replaced', chunk);
        const replaceItem = currentAIMessage?.messages.find((msg) => msg.detail?.item_id === eventData.item_id);
        if (replaceItem) {
          console.log('item found, replace it');
          console.log('before replace', JSON.stringify(replaceItem.detail, null, 2));
          replaceItem.detail = {
            ...replaceItem.detail,
            ...chunk.detail,
          };
          console.log('after replace', JSON.stringify(replaceItem.detail, null, 2));
        } else {
          console.log('[replaced] item not found, do nothing');
        }
        continue;
      }

      console.error('unknown chatkit event', eventData);
      continue;
    }

    // ─────────────── non ChatKit logic ───────────────

    // ignore certain specific tool calls

    // Ignore selected tool-call types
    if (ignoreToolChunks.includes((chunk as MessageToolChunk).detail?.tool) || ignoreToolChunks.includes(chunk.type)) {
      continue;
    }

    // User message — detect a new turn
    if (chunk.role === 'user') {
      // Save the current AI message first if any
      if (currentAIMessage) {
        finalizeCurrentAssistant();
        currentAIMessage = undefined;
      }

      // Append the user message
      newMessages.push({
        role: 'user',
        messages: [chunk],
      });
      continue;
    }
    ensureAssistantMessage(chunk);
    if (!currentAIMessage) {
      continue;
    }

    if (
      chunk.type !== 'plan' &&
      chunk.type !== 'plan_update' &&
      isDuplicateChunkId(currentAIMessage, chunk)
    ) {
      continue;
    }

    // Handle live_status
    if (chunk.type === 'live_status') {
      // Handle only the last one
      if (chunk.id === latestLiveStatusChunk?.id) {
        // Find the plan
        const latestPlan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
        // If there is a plan
        if (latestPlan) {
          // Attach to an unfinished step, else to messages
          const step = latestPlan.children.find((step: PlanStep) => step.status === 'running') as PlanStep;
          if (step) {
            step.children.push(chunk);
            continue;
          }
        }
        // Append to messages when there is no plan or unfinished step
        currentAIMessage.messages.push(chunk);
      }
      // Ignore the rest and break
      continue;
    }

    // Handle plan
    if (isPlanChunk(chunk)) {
      const existingPlan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
      if (existingPlan) {
        planMerge(existingPlan, chunk as any);
      } else {
        currentAIMessage = filterLiveStatus(currentAIMessage);
        currentAIMessage.messages.push(handlePlanChunk(chunk as any));
      }
      continue;
    }

    // Handle plan_update
    if (chunk.type === 'plan_update') {
      // This chunk is a PlanUpdateChunk
      const planUpdateChunk = chunk as any;
      // Find an existing plan
      const plan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
      if (plan) {
        handlePlanUpdateChunk(plan, planUpdateChunk);
      }
      // Break after handling
      continue;
    }

    // // no tool and has run_id: try to merge the items with same run_id and type
    if (!chunk.detail?.tool && !!chunk.detail?.run_id) {
      // the first item with same run_id and type
      const firstRunIndex = chunksCopy.findIndex((c) => c.detail?.run_id === chunk.detail?.run_id && c.type === chunk.type);
      // find all items with same run_id and type
      const items = chunksCopy.filter((c) => c.detail?.run_id === chunk.detail?.run_id && c.type === chunk.type);
      // if this is the first item with same run_id and type
      if (items.length > 1) {
        if (firstRunIndex === i) {
          chunk.content = items.map((c) => c.content).join('');
        } else {
          // skip items not the first
          continue;
        }
      }
    }

    // Handle tool_call — check if the next item is tool_result
    if (chunk.type === 'tool_call') {
      // This chunk is a MessageToolChunk
      const toolCallChunk = chunk as MessageToolChunk;
      // This chunk type is tool
      chunk.type = toolCallChunk.detail.tool;
    }
    if (chunk.type === 'tool_result') {
      // const lastItem = currentAIMessage.messages[currentAIMessage.messages.length - 1];
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
      // If not in messages, search the plan
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

    // Handle node_start and node_end
    if (chunk.type === 'node_end') {
      const nodeStartChunk = currentAIMessage.messages.findLast(
        (ck) => ck.type === 'node_start' && ck.detail?.node_id === chunk.detail?.node_id,
      );
      if (nodeStartChunk) {
        Object.assign(nodeStartChunk, chunk); // Mutate nodeStartChunk in place
      } else {
        // If missing, find the previous assistant message and its node_start
        // Search previous assistant messages from the end
        for (let j = newMessages.length - 1; j >= 0; j--) {
          const prevMessage = newMessages[j];
          if (prevMessage.role === 'assistant' && prevMessage !== currentAIMessage) {
            const nodeStartInPrev = prevMessage.messages.findLast(
              (ck) => ck.type === 'node_start' && ck.detail?.node_id === chunk.detail?.node_id,
            );
            if (nodeStartInPrev) {
              Object.assign(nodeStartInPrev, chunk);
              break;
            }
          }
        }
      }
      continue;
    }

    // if (chunk.type === 'user_input') {
    //   currentAIMessage = filterLiveStatus(currentAIMessage);
    //   currentAIMessage.messages.push(chunk);
    //   continue;
    // }

    if (isFinishChunk(chunk)) {
      currentAIMessage = filterLiveStatus(currentAIMessage);
      currentAIMessage.messages.push(chunk);
      // currentAIMessage = moveFilesToEnd(currentAIMessage);
      continue;
    }

    const plan = currentAIMessage.messages.find(isPlanChunk) as MessagePlanChunk;
    // Default: attach to the step when step_id exists, else to messages
    if (chunk.step_id) {
      if (plan) {
        const step = plan.children.find((step: PlanStep) => step.id === chunk.step_id);
        if (step) {
          // Drop liveStatus from the current step if present
          step.children = step.children.filter((child) => child.type !== 'live_status');
          step.children.push(chunk);
          continue;
        }
      }
    }
    // No step_id: look for a running step
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

    // No step_id: append to messages
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
      currentAIMessage = filterLiveStatus(currentAIMessage);
      currentAIMessage = changePlanStepStatusToSuccess(currentAIMessage);
    }
    if (!currentAIMessageAlreadyInList) {
      newMessages.push(currentAIMessage);
    }
  }

  // if the last item is user message, add a live_status
  if (newMessages[newMessages.length - 1]?.role === 'user') {
    newMessages.push(getLoadingMessage());
  }

  return newMessages;
};
