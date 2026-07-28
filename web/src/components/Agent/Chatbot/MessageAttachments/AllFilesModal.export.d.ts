import React from 'react';

export interface AllFilesModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

/**
 * AllFilesModal - File Management Blast Component
 *
 * @example
 * ```tsx
 * import { AllFilesModal } from '@langcrew/agentx';
 *
 * function MyComponent() {
 *   const [open, setOpen] = useState(false);
 *
 *   return (
 *     <AllFilesModal
 *       open={open}
 *       onClose={() => setOpen(false)}
 *       sessionId="your-session-id"
 *     />
 *   );
 * }
 * ```
 */
export declare const AllFilesModal: React.FC<AllFilesModalProps>;
export default AllFilesModal;
