import React, { memo, useEffect, useRef } from 'react';
import jsPreviewDocx from '@js-preview/docx';
import jsPreviewExcel from '@js-preview/excel';
import { init } from 'pptx-preview';
import '@js-preview/docx/lib/index.css';
import '@js-preview/excel/lib/index.css';

export interface OfficeFilePreviewProps {
  url: string;
  fileType: string;
}

const OfficeFilePreview: React.FC<OfficeFilePreviewProps> = ({ url, fileType }) => {
  const ref = useRef<HTMLDivElement>(null);

  const initializePreview = () => {
    const dom = ref.current;

    if (dom) {
      if (fileType === 'docx') {
        const myDocxPreviewer = jsPreviewDocx.init(dom);
        myDocxPreviewer.preview(url);
      }

      if (fileType === 'xlsx') {
        const myExcelPreviewer = jsPreviewExcel.init(dom);
        myExcelPreviewer.preview(url);
      }

      if (fileType === 'pptx') {
        const pptxPrviewer = init(dom, {
          width: dom.clientWidth,
          height: dom.clientHeight,
        });
        fetch(url)
          .then((response) => {
            return response.arrayBuffer();
          })
          .then((res) => {
            pptxPrviewer.preview(res);
          });
      }
    }
  };

  useEffect(() => {
    initializePreview();
  }, []);

  return <div ref={ref} className="w-full h-full"></div>;
};

export default memo(OfficeFilePreview);
