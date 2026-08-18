import AppRouter from './router';
import './index.css';
import './assets/fonts/iconfont.css';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import ruRu from 'antd/locale/ru_RU';
import '@ant-design/v5-patch-for-react-19'; // antd v5 targets React 16-18; this patch adapts React 19 and will be removed in v6.
import { getLanguage } from './hooks/useTranslation';
import React from 'react';

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
  return (
    <ConfigProvider {...antdConfig}>
      <AntApp>
        <AppRouter />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
