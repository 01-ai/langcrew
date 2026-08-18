import React, { useEffect, useState } from 'react';
import { LinkOutlined } from '@ant-design/icons';
import classNames from 'classnames';
import type { CitationSource, CitationSourceType } from '@/types';
import WebIcon from '@/assets/svg/citations/web.svg?react';
import KnowledgeIcon from '@/assets/svg/citations/knowledge.svg?react';
import FileIcon from '@/assets/svg/citations/file.svg?react';
import MemoryIcon from '@/assets/svg/citations/memory.svg?react';

interface CitationSourceIconProps {
  source: CitationSource;
  className?: string;
}

const FAVICON_FAILURE_TTL = 5 * 60 * 1000;
const faviconFailureExpirations = new Map<string, number>();

const getFaviconFailureExpiration = (url?: string) => {
  if (!url) return undefined;
  const expiration = faviconFailureExpirations.get(url);
  if (!expiration) return undefined;
  if (expiration > Date.now()) return expiration;
  faviconFailureExpirations.delete(url);
  return undefined;
};

const getWebFaviconUrl = (source: CitationSource) => {
  if (source.type !== 'web') return undefined;
  return source.favicon_url;
};

export const getCitationTypeIcon = (type: CitationSourceType) => {
  switch (type) {
    case 'knowledge':
      return <KnowledgeIcon />;
    case 'file':
      return <FileIcon />;
    case 'memory':
      return <MemoryIcon />;
    case 'web':
      return <WebIcon />;
    default:
      return <LinkOutlined />;
  }
};

export const CitationSourceIcon: React.FC<CitationSourceIconProps> = ({ source, className }) => {
  const faviconUrl = getWebFaviconUrl(source);
  const [failedUntil, setFailedUntil] = useState<number | undefined>(() =>
    getFaviconFailureExpiration(faviconUrl),
  );
  const failed = Boolean(failedUntil && failedUntil > Date.now());

  useEffect(() => {
    setFailedUntil(getFaviconFailureExpiration(faviconUrl));
  }, [faviconUrl]);

  useEffect(() => {
    if (!faviconUrl || !failedUntil) return;
    const retryDelay = Math.max(0, failedUntil - Date.now());
    const timer = window.setTimeout(() => {
      setFailedUntil(getFaviconFailureExpiration(faviconUrl));
    }, retryDelay);
    return () => window.clearTimeout(timer);
  }, [faviconUrl, failedUntil]);

  const handleFaviconError = () => {
    if (!faviconUrl) return;
    const expiration = Date.now() + FAVICON_FAILURE_TTL;
    faviconFailureExpirations.set(faviconUrl, expiration);
    setFailedUntil(expiration);
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center justify-center overflow-hidden rounded-full text-[#1677ff] p-[1px] [&>img]:h-full [&>img]:w-full [&>img]:object-contain [&>svg]:h-full [&>svg]:w-full',
        className,
      )}
      aria-hidden="true"
    >
      {faviconUrl && !failed ? (
        <img src={faviconUrl} alt="" onError={handleFaviconError} />
      ) : (
        getCitationTypeIcon(source.type)
      )}
    </span>
  );
};
