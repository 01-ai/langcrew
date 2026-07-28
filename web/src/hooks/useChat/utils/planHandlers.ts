import { EventPlanChunk, MessageChunk, MessagePlanChunk, PlanStep, PlanUpdateChunk, TaskStatus } from '@/types';
import { isFinishChunk } from './messageFilters';

/**
 * To determine whether the message is plan chunk
 */
export function isPlanChunk(message: MessageChunk) {
  return message.type === 'plan';
}

/**
 * Here. step Add children
 */
const stepMapper = (step: PlanStep) => {
  return {
    ...step,
    children: [],
  };
};

/**
 * Processing plan chunk
 */
export function handlePlanChunk(chunk: EventPlanChunk) {
  const plan = {
    ...chunk,
    children: chunk.detail.steps.map(stepMapper),
  };
  return plan as MessagePlanChunk;
}

/**
 * Processing plan update chunk
 */
export function handlePlanUpdateChunk(plan: MessagePlanChunk, planUpdateChunk: PlanUpdateChunk) {
  // Add a new step.
  if (planUpdateChunk.detail?.action === 'add') {
    // If detail.steps & Empty, directly assigned
    if (!plan.children) {
      plan.children = planUpdateChunk.detail.steps.map(stepMapper);
    } else {
      // Otherwise merge
      plan.children.push(...planUpdateChunk.detail.steps.map(stepMapper));
    }
  }
  // Update an existing step.
  if (planUpdateChunk.detail?.action === 'update') {
    planUpdateChunk.detail?.steps?.forEach((newStep) => {
      // Find the right one. step
      const index = plan.children.findIndex((step: PlanStep) => step.id === newStep.id);
      // Update if found
      if (index !== -1) {
        // Merge
        plan.children[index] = {
          ...plan.children[index],
          ...newStep,
        };
      }
    });
  }
  // Remove an existing step.
  if (planUpdateChunk.detail?.action === 'remove') {
    planUpdateChunk.detail?.steps?.forEach((newStep) => {
      // Find the right one. step
      const index = plan.children.findIndex((step: PlanStep) => step.id === newStep.id);
      // If found, delete
      if (index !== -1) {
        plan.children.splice(index, 1);
      }
    });
  }
  return plan;
}

/**
 * Merge plan
 */
export function planMerge(existingPlan: MessagePlanChunk, newPlan: EventPlanChunk) {
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

/**
 * Access plan
 */
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
  if (plan) {
    // Because of this...childrenAll empty, so filtering is not allowed.
    // plan.children = filterEmptySteps(plan.children);
  }
  return plan;
};

export const filterEmptySteps = (steps: PlanStep[]) => {
  return steps?.filter(
    (step) =>
      step.status === TaskStatus.Running ||
      step.status === TaskStatus.Success ||
      step.status === TaskStatus.Error ||
      step?.children?.some((child) => !(child.type === 'text' && child.content === '')),
  );
};
