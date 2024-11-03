import { Select, MenuItem } from '@mui/material';
import { useAppTranslation } from '../hooks/useAppTranslation';
import React from 'react';

export const LanguageSelector = () => {
  const { t, currentLanguage, changeLanguage, languages } = useAppTranslation('settings');
  

  return (
    <Select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      size="small"
    >
      {Object.entries(languages).map(([code, name]) => (
        <MenuItem key={code} value={code}>
          {t(`settings:general.language.${code}`)}
        </MenuItem>
      ))}
    </Select>
  );
}; 