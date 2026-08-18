import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import '@/config/i18n';  // in-component vs outside i18n cannot share; use custom useTranslation

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
