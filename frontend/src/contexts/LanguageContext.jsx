import React from 'react';

const LanguageContext = React.createContext({
  currentLanguage: 'zh-TW',
  changeLanguage: () => {}
});

export default LanguageContext;
