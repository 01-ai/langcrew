import { useTranslation } from '@/hooks/useTranslation';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { Radio } from 'antd';

import React, { useState } from 'react';

interface CodeProps {
  originalCode?: string;
  code?: string;
  isDiff?: boolean;
  /**
   * Monaco Editor 支持的所有语言
   */
  language?:
  | 'abap'
  | 'apex'
  | 'azcli'
  | 'bat'
  | 'bicep'
  | 'c'
  | 'cameligo'
  | 'clojure'
  | 'coffeescript'
  | 'cpp'
  | 'csharp'
  | 'csp'
  | 'css'
  | 'dart'
  | 'dockerfile'
  | 'ecl'
  | 'elixir'
  | 'fsharp'
  | 'go'
  | 'graphql'
  | 'handlebars'
  | 'hcl'
  | 'html'
  | 'ini'
  | 'java'
  | 'javascript'
  | 'json'
  | 'julia'
  | 'kotlin'
  | 'less'
  | 'lexon'
  | 'lua'
  | 'markdown'
  | 'mips'
  | 'msdax'
  | 'mysql'
  | 'objective-c'
  | 'pascal'
  | 'pascaligo'
  | 'perl'
  | 'pgsql'
  | 'php'
  | 'plaintext'
  | 'postiats'
  | 'powerquery'
  | 'powershell'
  | 'proto'
  | 'pug'
  | 'python'
  | 'qsharp'
  | 'r'
  | 'razor'
  | 'redis'
  | 'redshift'
  | 'restructuredtext'
  | 'ruby'
  | 'rust'
  | 'sb'
  | 'scala'
  | 'scheme'
  | 'scss'
  | 'shell'
  | 'sol'
  | 'aes'
  | 'sparql'
  | 'sql'
  | 'st'
  | 'swift'
  | 'systemverilog'
  | 'tcl'
  | 'twig'
  | 'typescript'
  | 'vb'
  | 'xml'
  | 'yaml';
}

/**
 * 代码展示组件,只读模式
 */
const Code = ({ originalCode = '', code = '', language = 'plaintext', isDiff = true }: CodeProps) => {
  const [mode, setMode] = useState<'diff' | 'old' | 'new'>('new');
  const { t } = useTranslation();

  const editorProps = {
    width: '100%',
    height: '100%',
    language,
    theme: 'vs-dark',
    options: {
      readOnly: true,
      lineNumbers: 'off' as any,
      minimap: {
        enabled: false,
      },
      unicodeHighlight: {
        ambiguousCharacters: false,
      },
    },
  };

  const renderCode = () => {
    if (mode === 'diff') {
      return <DiffEditor original={originalCode} modified={code} {...editorProps} />;
    } else if (mode === 'old') {
      return <Editor value={originalCode} {...editorProps} />;
    } else if (mode === 'new') {
      return <Editor value={code} {...editorProps} />;
    }
  };

  if (isDiff) {
    return (
      <div className="w-full h-full relative">
        {renderCode()}
        <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} className="absolute top-2 right-2 z-[1000]">
          <Radio.Button value="diff">{t('code.diff')}</Radio.Button>
          <Radio.Button value="old">{t('code.old')}</Radio.Button>
          <Radio.Button value="new">{t('code.new')}</Radio.Button>
        </Radio.Group>
      </div>
    );
  }
  return <Editor {...editorProps} value={code} />;
};

export default Code;
