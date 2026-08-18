import { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#000',
    colorLinkHover: '#000',
    colorError: '#DF0E0E',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',

    borderRadiusLG: 20,
    controlOutlineWidth: 1,
  },

  components: {
    Button: {
      defaultColor: '#000',
      defaultHoverBg: '#F6F6F8',
      defaultHoverColor: '#000',
      defaultHoverBorderColor: 'rgb(217,217,217)',
      defaultActiveColor: '#000',
      colorLinkHover: '#69b1ff',
      colorBorder: '#d8d8d8',
      controlHeight: 36,
      textTextColor: '#000',
      textTextHoverColor: '#000',
      borderRadius: 8,
      primaryShadow: `0 -1.5px 1px 0 #000 inset, 0 1.5px 1px 0 rgba(255, 255, 255, 0.30) inset`,
    },

    Select: {
      optionSelectedColor: '#000',
      optionSelectedBg: 'rgb(234, 234, 234)',
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
      borderRadiusLG: 10,
      itemHeight: 36,
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

    Dropdown: {
      // Selected-menu background
      controlItemBgActive: '#F6F6F8',
      // Selected-menu hover background
      controlItemBgActiveHover: '#F6F6F8',
    },
  },
};
