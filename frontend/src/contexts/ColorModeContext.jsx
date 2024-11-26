import React from 'react';

const ColorModeContext = React.createContext({ 
  toggleColorMode: () => {},
  currentMode: 'light'
});

export default ColorModeContext;
