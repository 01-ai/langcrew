import React from 'react';
import { BriefRendererProps } from '..';
import { Markdown } from '@/components/Infra';
import MentionInteractive from '@/components/Mentions/MentionInteractive';
import { useOpenCitationSource } from '@/features/citation';
import type { Mention } from '@/types';
import { splitContentByMentions } from '@/utils/mentions';
import './MentionBrief.less';

const TextBriefRenderer: React.FC<BriefRendererProps> = ({ message, citations }) => {
  const openCitationSource = useOpenCitationSource();
  const mentions = (message.detail?.mentions as Mention[] | undefined) ?? [];

  if (mentions.length > 0) {
    const parts = splitContentByMentions(message.content, mentions);

    return (
      <div className="registry-mention-brief whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (part.type === 'mention') {
            return (
              <MentionInteractive
                key={`mention-${index}-${part.mention.token}`}
                mention={part.mention}
                variant="message"
                className="registry-mention-chip"
              />
            );
          }

          if (!part.text) return null;

          // Prefer plain text segments so chips stay inline with surrounding copy.
          // Mentions currently appear in user messages that are mostly plain text.
          return <span key={`text-${index}`}>{part.text}</span>;
        })}
      </div>
    );
  }

  return (
    <Markdown content={message.content} citations={citations} onCitationOpen={openCitationSource} />
  );
};

export default TextBriefRenderer;
