import React, { HTMLAttributes } from 'react';
import Icon from '@ant-design/icons';
import type { GetProps } from 'antd';

import FileViewerCloseSvg from '@/assets/svg/fileviewer/close.svg?react';
import FileViewerDownloadSvg from '@/assets/svg/fileviewer/download.svg?react';
import FileViewerDownloadPngSvg from '@/assets/svg/fileviewer/download.png';
import FileViewerZoomInSvg from '@/assets/svg/fileviewer/zoom-in.svg?react';
import FileViewerZoomOutSvg from '@/assets/svg/fileviewer/zoom-out.svg?react';
import FileViewerPptSvg from '@/assets/svg/fileviewer/ppt.svg?react';
import FileViewerBatchDownloadSvg from '@/assets/svg/fileviewer/batch_download.svg?react';

type CustomIconComponentProps = GetProps<typeof Icon>;

export const FileViewerCloseIcon = (props: CustomIconComponentProps) => (
  <Icon component={FileViewerCloseSvg} {...props} />
);
export const FileViewerDownloadIcon = (props: CustomIconComponentProps) => (
  <Icon component={FileViewerDownloadSvg} {...props} />
);
export const FileViewerBatchDownloadIcon = (props: CustomIconComponentProps) => (
  <Icon component={FileViewerBatchDownloadSvg} {...props} />
);
export const FileViewerZoomInIcon = (props: CustomIconComponentProps) => (
  <Icon component={FileViewerZoomInSvg} {...props} />
);
export const FileViewerZoomOutIcon = (props: CustomIconComponentProps) => (
  <Icon component={FileViewerZoomOutSvg} {...props} />
);
export const FileViewerPptIcon = (props: CustomIconComponentProps) => <Icon component={FileViewerPptSvg} {...props} />;
export const FileViewerDownloadPngIcon = (props: HTMLAttributes<HTMLImageElement>) => (
  <img src={FileViewerDownloadPngSvg} {...props} />
);