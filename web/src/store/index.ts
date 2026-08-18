// Export the default global store (non-React)
export { default as useAgentStoreDefault } from './agent';
// Export context-aware hooks (Context or global store)
export { AgentStoreProvider, useAgentStore, useAgentStoreApi, useRequestClient } from './AgentStoreContext';
export type { AgentStore } from './agent';
export type {
  AgentXCapabilities,
  AgentXRequestAdapter,
  RequestClient,
} from '@/services/requestClient';
