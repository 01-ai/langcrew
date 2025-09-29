import React, { Fragment } from 'react';
import Ansi from 'ansi-to-react';

interface TerminalProps {
  content: string;
}

/**
 * terminal output component, using ansi-to-react to process terminal output
 *
 * @example
 * const terminalString = "\u001b[32mubuntu@sandbox:~ $\u001b[0m cd /home/ubuntu && mkdir -p chartmetric_analysis && cd chartmetric_analysis && mkdir -p data\n\n\u001b[32mubuntu@sandbox:~/chartmetric_analysis $\u001b[0m";
 * <Terminal content={terminalString} />
 */
const Terminal: React.FC<TerminalProps> = ({ content }) => {
  // first use Ansi to process, then split \n into multiple lines and insert <br />
  // only render the first 1000 lines
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
