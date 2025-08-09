import React, { Fragment } from 'react';
import Ansi from 'ansi-to-react';

interface TerminalProps {
  content: string;
}

/**
 * 终端输出组件 使用 ansi-to-react 处理终端输出
 *
 * @example
 * const terminalString = "\u001b[32mubuntu@sandbox:~ $\u001b[0m cd /home/ubuntu && mkdir -p chartmetric_analysis && cd chartmetric_analysis && mkdir -p data\n\n\u001b[32mubuntu@sandbox:~/chartmetric_analysis $\u001b[0m";
 * <Terminal content={terminalString} />
 */
const Terminal: React.FC<TerminalProps> = ({ content }) => {
  // 先用 Ansi 处理，再把 \n 拆分成多行插入 <br />
  // 只渲染前1000行
  const lines = content.split('\n').slice(0, 1000);
  return (
    <div className="terminal-output w-full h-full whitespace-pre-wrap p-4 overflow-y-auto">
      {lines.map((line, idx) => (
        <Fragment key={idx}>
          <Ansi>{line}</Ansi>
          {idx !== lines.length - 1 && <br />}
        </Fragment>
      ))}
    </div>
  );
};

export default Terminal;
