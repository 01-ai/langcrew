# Virtual Scrolling for Large Files

AgentX uses virtual scrolling to keep large Markdown and CSV previews responsive. Small files render directly; larger files are parsed into blocks and only the visible region is mounted.

## Strategy Selection

`getContentStats()` in `src/utils/markdownBlockParser.ts` selects a strategy from the encoded content size:

| Size | Strategy | Rendering |
| --- | --- | --- |
| Less than 1 MB | `direct` | Render the complete document |
| 1-5 MB | `main-thread` | Parse blocks on the main thread and virtualize them |
| 5-20 MB | `worker` | Parse in a Web Worker and virtualize the result |
| More than 20 MB | `stream` | Parse chunks in a Web Worker and display them incrementally |

If a Worker cannot be initialized or parsing fails, AgentX falls back to main-thread parsing.

## Main Modules

- `src/utils/markdownBlockParser.ts` splits Markdown into headings, paragraphs, lists, tables, code blocks, block quotes, and thematic breaks.
- `src/utils/markdownParser.worker.ts` exposes parsing through a Web Worker.
- `src/utils/workerManager.ts` owns the Worker lifecycle and reports progress.
- `src/components/Infra/VirtualMarkdown/index.tsx` renders parsed blocks with `react-virtuoso`.
- `src/components/Infra/FileContentRender/index.tsx` chooses direct or virtual rendering.
- `src/components/Infra/CSVViewer/index.tsx` renders tabular previews.

## VirtualMarkdown API

```ts
interface VirtualMarkdownProps {
  content?: string;
  className?: string;
  processing?: boolean;
  onCopied?: (text: string) => void;
  parseStrategy?: 'main-thread' | 'worker' | 'stream';
}
```

Normally the strategy is selected automatically. `parseStrategy` is intended for diagnostics and controlled integrations.

```tsx
<VirtualMarkdown
  content={markdown}
  className="document-preview"
  onCopied={(text) => navigator.clipboard.writeText(text)}
/>
```

## Limitations

- Browser `Ctrl+F` can search only mounted virtual blocks.
- Anchor navigation requires translating a heading target into a virtual-list index.
- Large nested lists and tables are kept together, so their estimated height may be less accurate.
- Web Worker loading depends on the host bundler and its asset policy.

## Verification

Use the `/test-virtual-scroll` development route to generate large Markdown or CSV samples. Verify initial render time, scrolling stability, parsing progress, Worker fallback, and memory usage. Run `pnpm test` and `pnpm build` before publishing changes.
