import React, { Fragment } from 'react';
import Ansi from 'ansi-to-react';

interface TerminalProps {
  content: string;
}

/**
 * Terminal output component used ansi-to-react Process terminal output
 *
 * @example
 * const terminalString = "\u001b[32mubuntu@sandbox:~ $\u001b[0m cd /home/ubuntu && mkdir -p chartmetric_analysis && cd chartmetric_analysis && mkdir -p data\n\n\u001b[32mubuntu@sandbox:~/chartmetric_analysis $\u001b[0m";
 * <Terminal content={terminalString} />
 */
const Terminal: React.FC<TerminalProps> = ({ content }) => {
  // First. Ansi Handle it. \n Split Multiline Insert <br />
  // Before rendering only1000Okay.
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
