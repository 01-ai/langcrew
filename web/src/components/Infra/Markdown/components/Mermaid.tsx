import React, { useMemo, useEffect, useCallback, useRef, memo } from 'react';
import { debounce } from 'lodash-es';
import mermaid from 'mermaid';

import type { MermaidConfig } from 'mermaid';

interface MermaidProps {
  processing?: boolean;
  text: string;
}

const Mermaid: React.FC<MermaidProps> = memo(({ processing, text }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  const mermaidDefaultConfig = useMemo(() => {
    const types = [
      'flowchart',
      'sequence',
      'gantt',
      'journey',
      'timeline',
      'class',
      'state',
      'er',
      'pie',
      'quadrantChart',
      'requirement',
      'mindmap',
      'gitGraph',
      'c4',
      'sankey',
    ] as (keyof MermaidConfig)[];

    return types?.reduce((config, type) => {
      config[type] = {
        useWidth: 748,
        useMaxWidth: true,
      };
      return config;
    }, {} as MermaidConfig);
  }, []);

  const getRandomInteger = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min)) + min;
  };

  const delay = useMemo(() => {
    const range = processing ? [1000, 1501] : [0, 31];
    return getRandomInteger(range[0], range[1]);
  }, [processing]);

  const mermaidRender = (text: string, node: HTMLDivElement) => {
    if (text && node) {
      mermaid.run({
        nodes: [node],
        suppressErrors: true,
      });
    }
  };

  const mermaidRenderDebounce = useCallback(
    debounce(mermaidRender, delay, {
      leading: true,
    }),
    [],
  );

  useEffect(() => {
    mermaid.initialize({
      theme: 'forest',
      startOnLoad: false,
      fontSize: 12,
      ...mermaidDefaultConfig,
    });
  }, [mermaidDefaultConfig]);

  useEffect(() => {
    mermaidRenderDebounce(text, mermaidRef.current as HTMLDivElement);
  }, [text, mermaidRenderDebounce]);

  return (
    <div className="mermaid-container" ref={mermaidRef}>
      {text}
    </div>
  );
});

export default Mermaid;
