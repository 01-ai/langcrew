import type {
  CitationSource,
  CitationSourceType,
  KnowledgeCitationSource,
  MessageChunk,
  MessageItem,
  MessagePlanChunk,
} from '@/types';

const CODE_PATTERN = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g;
const CITATION_PATTERN = /\[\[citation:([A-Za-z0-9._-]+(?:\s*,\s*[A-Za-z0-9._-]+)*)\]\]/g;

export const CITATION_TYPE_ORDER: CitationSourceType[] = ['web', 'knowledge', 'file', 'memory', 'unknown'];

export const normalizeCitationId = (value: unknown) => String(value ?? '').trim();

/**
 * Group citation sources by type and sort groups in display order.
 * Source order within each type is preserved.
 */
export const groupCitationSourcesByType = (sources: CitationSource[]) => {
  const groups = new Map<CitationSourceType, CitationSource[]>();

  sources.forEach((source) => {
    const list = groups.get(source.type) || [];
    list.push(source);
    groups.set(source.type, list);
  });

  return CITATION_TYPE_ORDER.filter((type) => groups.has(type)).map((type) => ({
    type,
    sources: groups.get(type) || [],
  }));
};
export const getCitationTitle = (source: CitationSource) => {
  switch (source.type) {
    case 'web':
      return source.title;
    case 'knowledge':
      return source.knowledge_name;
    case 'file':
      return source.filename;
    case 'memory':
      return source.source_name || source.id;
    default:
      return source.title || source.id;
  }
};

export const getCitationExcerpt = (source: CitationSource) => {
  switch (source.type) {
    case 'web':
      return source.snippet;
    case 'knowledge':
    case 'memory':
      return source.content;
    case 'unknown':
      return source.content;
    default:
      return undefined;
  }
};

export const getCitationUrl = (source: CitationSource) => {
  if (source.type === 'web') {
    return source.url;
  }
  return 'url' in source ? source.url : undefined;
};

export const getCitationSourceName = (source: CitationSource) => {
  switch (source.type) {
    case 'web':
      return source.site_name;
    case 'knowledge':
      return source.source === 'knowledge' ? source.document_name : source.question;
    case 'file':
      return source.content_type;
    default:
      return undefined;
  }
};

export const getCitationTimestamp = (source: CitationSource) => {
  switch (source.type) {
    case 'web':
      return source.published_at;
    case 'knowledge':
      return source.updated_at;
    default:
      return undefined;
  }
};

export const formatCitationDate = (value?: string | null) => {
  if (!value) return undefined;
  const date = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return date ? `${date[1]}/${date[2]}/${date[3]}` : value;
};

export const getCitationFileTypeLabel = (contentType: string) => {
  const normalizedType = contentType.split(';', 1)[0].trim();
  const subtype = normalizedType.includes('/')
    ? normalizedType.slice(normalizedType.lastIndexOf('/') + 1)
    : normalizedType;
  return subtype.toUpperCase();
};

export interface KnowledgeCitationGroup {
  source: KnowledgeCitationSource;
  sources: KnowledgeCitationSource[];
  fragmentCount?: number;
}

export interface KnowledgeBaseCitationGroup {
  knowledgeId: string;
  knowledgeName: string;
  /** Document knowledge base vs QA knowledge base — system-separated. */
  source: KnowledgeCitationSource['source'];
  sources: KnowledgeCitationSource[];
  fragmentCount: number;
}

/**
 * Group knowledge citation sources by knowledge base.
 * Document KB and QA KB are system-separated even if knowledge_id collides.
 */
export const groupKnowledgeCitationSourcesByKnowledgeBase = (
  sources: CitationSource[],
): KnowledgeBaseCitationGroup[] => {
  const groups = new Map<string, KnowledgeCitationSource[]>();

  sources.forEach((source) => {
    if (source.type !== 'knowledge') return;
    const groupKey = `${source.source}:${source.knowledge_id}`;
    const list = groups.get(groupKey) || [];
    list.push(source);
    groups.set(groupKey, list);
  });

  return Array.from(groups.values()).map((groupSources) => {
    const first = groupSources[0];
    return {
      knowledgeId: first.knowledge_id,
      knowledgeName: first.knowledge_name || first.knowledge_id,
      source: first.source,
      sources: groupSources,
      fragmentCount: groupSources.length,
    };
  });
};

/**
 * Group knowledge citation sources by document or question.
 * @param sources - The sources to group.
 * @returns The grouped sources.
 */
export const groupKnowledgeCitationSources = (sources: CitationSource[]): KnowledgeCitationGroup[] => {
  const groups = new Map<
    string,
    {
      sources: Map<string, KnowledgeCitationSource>;
      fragmentCount?: number;
    }
  >();

  sources.forEach((source) => {
    if (source.type !== 'knowledge') return;
    const isDocument = source.source === 'knowledge';
    const groupKey = isDocument ? `document:${source.document_id}` : `qa:${source.qa_id}`;
    const itemKey = isDocument ? source.chunk_id : source.qa_id;
    const group = groups.get(groupKey) || {
      sources: new Map<string, KnowledgeCitationSource>(),
      fragmentCount: isDocument ? 0 : undefined,
    };
    group.sources.set(itemKey, source);
    if (isDocument) {
      group.fragmentCount = group.sources.size;
    }
    groups.set(groupKey, group);
  });

  return Array.from(groups.values()).map((group) => {
    const groupedSources = Array.from(group.sources.values());
    return {
      source: groupedSources[0],
      sources: groupedSources,
      fragmentCount: group.fragmentCount,
    };
  });
};

export const parseCitationIds = (value: unknown) =>
  String(value ?? '')
    .split(',')
    .map(normalizeCitationId)
    .filter(Boolean);

export const extractCitationIds = (content: string) => {
  const ids: string[] = [];
  const seen = new Set<string>();
  const markdownWithoutCode = content.replace(CODE_PATTERN, '');
  const pattern = new RegExp(CITATION_PATTERN.source, CITATION_PATTERN.flags);
  let match = pattern.exec(markdownWithoutCode);

  while (match) {
    parseCitationIds(match[1]).forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    });

    match = pattern.exec(markdownWithoutCode);
  }

  return ids;
};

/**
 * Merge immediately adjacent citation markers into one group.
 * e.g. [[citation:S1,S2]][[citation:S3,S4]] → <citation>S1,S2,S3,S4</citation>
 * Keeps model output stable without requiring the model to merge groups itself.
 */
const replaceCitationGroups = (text: string) => {
  const adjacentPattern = new RegExp(`(?:${CITATION_PATTERN.source})+`, 'g');

  return text.replace(adjacentPattern, (match) => {
    const ids: string[] = [];
    const seen = new Set<string>();
    const pattern = new RegExp(CITATION_PATTERN.source, CITATION_PATTERN.flags);
    let citationMatch = pattern.exec(match);

    while (citationMatch) {
      parseCitationIds(citationMatch[1]).forEach((id) => {
        if (seen.has(id)) return;
        seen.add(id);
        ids.push(id);
      });
      citationMatch = pattern.exec(match);
    }

    return ids.length > 0 ? `<citation>${ids.join(',')}</citation>` : match;
  });
};

export const transformCitationSyntax = (content: string) => {
  const codePattern = new RegExp(CODE_PATTERN.source, CODE_PATTERN.flags);
  let result = '';
  let lastIndex = 0;
  let codeMatch = codePattern.exec(content);

  while (codeMatch) {
    result += replaceCitationGroups(content.slice(lastIndex, codeMatch.index));
    result += codeMatch[0];
    lastIndex = codeMatch.index + codeMatch[0].length;
    codeMatch = codePattern.exec(content);
  }

  return result + replaceCitationGroups(content.slice(lastIndex));
};

export const mergeCitationSources = (
  current: CitationSource[] = [],
  incoming: CitationSource[] = [],
): CitationSource[] => {
  const sources = new Map(current.map((source) => [normalizeCitationId(source.id), source]));

  incoming.forEach((source) => {
    const id = normalizeCitationId(source.id);
    if (!id) return;

    sources.set(id, {
      ...sources.get(id),
      ...source,
      id,
    });
  });

  return Array.from(sources.values());
};

const flattenMessageChunks = (messages: MessageChunk[]): MessageChunk[] => {
  const chunks: MessageChunk[] = [];

  const visit = (items: MessageChunk[]) => {
    items.forEach((chunk) => {
      chunks.push(chunk);
      if (chunk.type !== 'plan') return;
      (chunk as MessagePlanChunk).children?.forEach((step) => {
        if (step.children?.length) visit(step.children);
      });
    });
  };

  visit(messages);
  return chunks;
};

const collectMessageContent = (messages: MessageChunk[]) =>
  flattenMessageChunks(messages)
    .filter((message) => message.role === 'assistant' || message.role === undefined)
    .map((message) => message.content || '')
    .join('\n');

export const getReferencedCitationSources = (message: MessageItem): CitationSource[] => {
  const chunks = flattenMessageChunks(message.messages);
  const availableSources = mergeCitationSources(
    chunks.flatMap((chunk) => mergeCitationSources(chunk.citations, chunk.detail?.citation_sources)),
    message.citations || [],
  );
  const citationIds = extractCitationIds(collectMessageContent(message.messages));

  if (citationIds.length === 0) {
    return availableSources;
  }

  const sourceById = new Map(availableSources.map((source) => [normalizeCitationId(source.id), source]));

  return citationIds.map(
    (id) =>
      sourceById.get(id) || {
        id,
        type: 'unknown',
        title: id,
      },
  );
};
