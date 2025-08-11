# LangCrew UI

## Author: Wang Zihao, Sheng Qing, Liu Shaoming, Chang Chunxing

## Technique Stack:

### React 19 + Antd + Antd X + Zustand + Rspack + Tailwind CSS + Pnpm

## Local Development:

### Install Dependencies: pnpm install

### Start Dev Server: pnpm dev

## Project Usage:

### Install Dependencies: pnpm add @langcrew-ui

### Import AgentX Component:

import AgentX from @langcrew-ui

```tsx
<AgentX
  agentId=""
  sessionId=""
  shareId=""
  sharePassword=""
  basePath=""
  backPath=""
  headerNode={<></>}
  footerNode={<></>}
  shareButtonNode={<></>}
  knowledgeBases={[]}
  mcpTools={[]}
  sandboxTools={[]}
  selectedKnowledgeBases={[]}
  selectedTools={[]}
  requestPrefix=""
  extraHeaders={{}}
  language=""
  senderContent=""
/>
```

- agentId is mandatory and should be obtained from Langcrew backend.

### For More Details, Please Refer to the Documentation:

https://01ai.feishu.cn/docx/LgcTdJtt5osqXYxyXQjczrw6nZd
