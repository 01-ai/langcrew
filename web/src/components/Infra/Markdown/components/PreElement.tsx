import React, { useCallback, useState, useRef, useLayoutEffect, lazy, Suspense } from 'react';
import { App } from 'antd';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import classNames from 'classnames';
import CustomIcon from './CustomIcon';
import { useTranslation } from '@/hooks/useTranslation';
const Mermaid = lazy(() => import('./Mermaid'));

interface PreElementProps {
  processing?: boolean;
  children?: React.ReactNode;
  onCopied?: (copy: string) => void;
}

const PreElement: React.FC<PreElementProps> = ({ processing, children, onCopied }) => {
  const [language, setLanguage] = useState('');
  const [copyText, setCopyText] = useState('');
  const { t } = useTranslation();
  const codeRef = useRef<HTMLDivElement>(null);
  const { message } = App.useApp();

  const handleCopied = useCallback((copy: string) => {
    if (copy.length > 0) {
      message.success(t('code.copy.success'));
    }
  }, []);

  useLayoutEffect(() => {
    if (codeRef?.current) {
      const codeClassName = codeRef?.current?.querySelectorAll('code')?.[0]?.className;
      const languageValue = codeClassName?.match(/language-(\w+)/)?.[1] || '';
      const copyTextValue = codeRef?.current?.innerText;

      if (language !== languageValue) {
        setLanguage(languageValue);
      }

      if (copyText !== copyTextValue) {
        setCopyText(copyTextValue);
      }
    }
  }, [copyText, language]);

  return (
    <>
      {language === 'mermaid' && (
        <Suspense>
          <Mermaid processing={processing} text={copyText} />
        </Suspense>
      )}
      <pre
        className={classNames({
          'code-wrapper': true,
          'code-wrapper-show': language !== 'mermaid',
        })}
      >
        <div className="code-header">
          <span>{language}</span>
          <CopyToClipboard text={copyText} onCopy={handleCopied}>
            <span className="copy-btn">
              <CustomIcon className="copy-icon" type="copy" />
              <span>{t('code.copy')}</span>
            </span>
          </CopyToClipboard>
        </div>
        <div ref={codeRef}>{children}</div>
      </pre>
    </>
  );
};

export default PreElement;
