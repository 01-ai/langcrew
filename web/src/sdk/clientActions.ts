// ============================================================
// Client Action SDK
// ============================================================

import { SyntheticEvent } from 'react';

export interface ClientActionArgs {
  action: string; // action type e.g. "open_modal"
  payload: Record<string, any>; // arbitrary payload
  event?: Event | SyntheticEvent | null;
}

export type ClientActionHandler = (args: ClientActionArgs) => void | Promise<void>;

const actionRegistry = new Map<string, ClientActionHandler>();

// Register an action
export function registerClientAction(type: string, handler: ClientActionHandler) {
  actionRegistry.set(type, handler);
}

// Remove an action
export function unregisterClientAction(type: string) {
  actionRegistry.delete(type);
}

// Clear all actions
export function clearClientActions() {
  actionRegistry.clear();
}

// Execute an action (UI layer calls this)
export async function executeClientAction(args: ClientActionArgs) {
  const handler = actionRegistry.get(args.action);

  if (!handler) {
    console.warn(`Unknown client action: ${args.action}`);
    return;
  }

  try {
    await handler(args);
  } catch (err) {
    console.error(`Action "${args.action}" failed:`, err);
  }
}
