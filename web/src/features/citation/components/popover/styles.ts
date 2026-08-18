import type { SyntheticEvent } from 'react';

export const citationPopoverCardHoverBG = 'hover:bg-[#F6F6F8]';

export const citationPopoverCardHoverClassName = `rounded-[10px] px-2 py-2 transition-colors cursor-pointer ${citationPopoverCardHoverBG}`;

/** Prevent popover content interactions from bubbling to the trigger. */
export const stopCitationPopoverBubble = (event: SyntheticEvent) => {
  event.stopPropagation();
};
