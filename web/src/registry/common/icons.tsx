import Icon, { ToolOutlined } from '@ant-design/icons';
import type { GetProps } from 'antd';

import PhoneSvg from '@/assets/svg/tools/phone.svg?react';
import EmptySvg from '@/assets/svg/tools/empty.svg?react';
import SearchSvg from '@/assets/svg/tools/search.svg?react';
import BrowserSvg from '@/assets/svg/tools/browser.svg?react';
import CodeSvg from '@/assets/svg/tools/code.svg?react';
import FileSvg from '@/assets/svg/tools/file.svg?react';
import ImageSvg from '@/assets/svg/tools/image.svg?react';
import CheckSvg from '@/assets/svg/tools/check.svg?react';
import TaskErrorSvg from '@/assets/svg/tools/task-error.svg?react';
import CircleSvg from '@/assets/svg/tools/circle.svg?react';
import ArrowSvg from '@/assets/svg/tools/arrow.svg?react';
import Phone2Svg from '@/assets/svg/tools/phone2.svg?react';
import React from 'react';

type CustomIconComponentProps = GetProps<typeof Icon>;

export const ToolIconPhone = (props: CustomIconComponentProps) => <Icon component={PhoneSvg} {...props} />;

export const ToolIconDefault = (props: CustomIconComponentProps) => <ToolOutlined {...props} />;

export const ToolIconEmpty = (props: CustomIconComponentProps) => <Icon component={EmptySvg} {...props} />;

export const ToolIconSearch = (props: CustomIconComponentProps) => <Icon component={SearchSvg} {...props} />;

export const ToolIconBrowser = (props: CustomIconComponentProps) => <Icon component={BrowserSvg} {...props} />;

export const ToolIconCode = (props: CustomIconComponentProps) => <Icon component={CodeSvg} {...props} />;

export const ToolIconFile = (props: CustomIconComponentProps) => <Icon component={FileSvg} {...props} />;

export const ToolIconImage = (props: CustomIconComponentProps) => <Icon component={ImageSvg} {...props} />;

export const ToolIconCheck = (props: CustomIconComponentProps) => <Icon component={CheckSvg} {...props} />;

export const ToolIconTaskError = (props: CustomIconComponentProps) => <Icon component={TaskErrorSvg} {...props} />;

export const ToolIconCircle = (props: CustomIconComponentProps) => <Icon component={CircleSvg} {...props} />;

export const ToolIconArrow = (props: CustomIconComponentProps) => <Icon component={ArrowSvg} {...props} />;

export const ToolIconPhone2 = (props: CustomIconComponentProps) => <Icon component={Phone2Svg} {...props} />;