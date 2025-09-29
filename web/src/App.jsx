import './index.css';
import './assets/fonts/iconfont.css';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import ruRu from 'antd/locale/ru_RU';
import '@ant-design/v5-patch-for-react-19'; // antd v5 默认兼容 React 16 ~ 18 版本，对于 React 19 版本，可以使用以下兼容方法进行适配。该兼容方式以及接口将在 v6 被移除。
import { getLanguage } from './hooks/useTranslation';
import React from 'react';
import AgentX from './AgentX';

const lang = getLanguage();
const localeMap = {
  en: enUS,
  zh: zhCN,
  'zh-CN': zhCN,
  ru: ruRu,
};

const antdConfig = {
  theme: {
    token: {
      colorPrimary: '#2051C9',
      colorLink: '#2051C9',
    },
  },
  locale: localeMap[lang] || enUS,
};

function App() {
  // return <AgentX requestPrefix="http://localhost:8000" />;
  return <AgentX />;
}

export default App;
