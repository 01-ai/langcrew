// ============================================================
// Client Action SDK - Type Declarations Only
// ============================================================

import { SyntheticEvent } from 'react';

export interface ClientActionArgs {
  action: string;
  payload: Record<string, any>;
  event?: Event | SyntheticEvent | null;
}

export type ClientActionHandler = (args: ClientActionArgs) => void | Promise<void>;

export function registerClientAction(type: string, handler: ClientActionHandler): void;
export function unregisterClientAction(type: string): void;
export function clearClientActions(): void;
export function executeClientAction(args: ClientActionArgs): Promise<void>;
