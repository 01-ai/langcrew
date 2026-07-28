import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import '@/config/i18n';  // Because of the inside and outside of the componentsi8nNot available for co-use, not for the time being.i18n ，Use custom useTranslation hookFunctions

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
