import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import '@/config/i18n';  // 由于组件内与组件外的i8n无法共同使用，暂时不使用i18n ，使用自定义 useTranslation hook函数

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
