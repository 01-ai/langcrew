import AppRouter from './router';
import './index.css';
import './assets/fonts/iconfont.css';
import { App as AntApp, Cascader, ConfigProvider, ConfigProviderProps } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import ruRu from 'antd/locale/ru_RU';
import '@ant-design/v5-patch-for-react-19'; // antd v5 Default Compatibility React 16 ~ 18 Version, yes. React 19 version, which can be adapted using the following compatible methods. The compatibility method and interface will be used in the v6 Removed.
import { getLanguage } from './hooks/useTranslation';
import React from 'react';

const lang = getLanguage();
const localeMap = {
  en: enUS,
  zh: zhCN,
  'zh-CN': zhCN,
  ru: ruRu,
};

const antdConfig: ConfigProviderProps = {
  theme: {
    token: {
      colorPrimary: '#000',
      colorLinkHover: '#000',
      colorError: '#DF0E0E',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      borderRadiusLG: 20,
    },
    components: {
      Button: {
        // colorBgContainer: 'transparent',
        defaultHoverBg: '#F6F6F8',
        colorLinkHover: '#69b1ff',
        colorBorder: '#d8d8d8',
        controlHeight: 36,
      },

      Select: {
        optionSelectedColor: '#fff',
        borderRadius: 8,
        borderRadiusSM: 6,
        borderRadiusLG: 8,
        optionPadding: '8px 12px',
        controlHeight: 36,
      },

      Message: {
        colorText: '#fff',
        contentBg: '#000',
        colorError: '#fff',
        colorSuccess: '#fff',
        contentPadding: '8px 16px 8px 12px',
      },

      Menu: {
        itemSelectedBg: '#e5e5e5',
      },
      Modal: {
        borderRadiusLG: 16,
      },

      Input: {
        activeShadow: 'none',
        controlHeight: 36,
      },
      Form: {
        itemMarginBottom: 20,
      },
      Switch: {
        colorPrimary: 'green',
        colorPrimaryHover: 'green',
      },

      Table: {
        rowSelectedBg: '#fafafa',
        rowSelectedHoverBg: '#fafafa',
      },

      // colorPrimary: '#000' causes @ant-design/colors to generate a dark palette
      // (e.g. generate('#000')[0] = '#404040'), so controlItemBgActive = colorPrimaryBg = '#404040'.
      // Override the Cascader selected-option background to a proper light color.
      Cascader: {
        optionSelectedBg: '#F6F6F8',
        optionSelectedColor: '#000',
      },
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
