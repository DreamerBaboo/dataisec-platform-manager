import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import { AuthProvider, useAuth } from './utils/auth.jsx';
import { I18nextProvider } from 'react-i18next';
import { i18n } from './i18n';
import { SnackbarProvider } from 'notistack';
import { useAppTranslation } from './hooks/useAppTranslation';
import PodDeploymentManagement from './components/PodDeployment/PodDeploymentManagement';

export const ColorModeContext = React.createContext({ 
  toggleColorMode: () => {},
  currentMode: 'light'
});

export const LanguageContext = React.createContext({
  currentLanguage: 'zh-TW',
  changeLanguage: () => {}
});

function AppContent() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  
  const { currentLanguage, changeLanguage } = useAppTranslation();

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('theme', newMode);
          return newMode;
        });
      },
      currentMode: mode
    }),
    [mode],
  );

  const languageContext = useMemo(
    () => ({
      currentLanguage,
      changeLanguage: (lang) => {
        localStorage.setItem('language', lang);
        changeLanguage(lang);
      }
    }),
    [currentLanguage, changeLanguage]
  );

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      changeLanguage(savedLanguage);
    }
  }, [changeLanguage]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary: { main: '#1976d2' },
                secondary: { main: '#dc004e' },
                background: { default: '#f5f5f5', paper: '#ffffff' },
              }
            : {
                primary: { main: '#90caf9' },
                secondary: { main: '#f48fb1' },
                background: { default: '#303030', paper: '#424242' },
              }),
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h4: { fontWeight: 600 },
          h5: { fontWeight: 500 },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 8,
              },
            },
          },
        },
      }),
    [mode],
  );

  const PrivateRoute = ({ children }) => {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" />;
  };

  return (
    <ColorModeContext.Provider value={colorMode}>
      <LanguageContext.Provider value={languageContext}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider maxSnack={3}>
            <CssBaseline />
            <AuthProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/*"
                    element={
                      <PrivateRoute>
                        <MainPage />
                      </PrivateRoute>
                    }
                  >
                    <Route path="pod-deployment" element={<PodDeploymentManagement />} />
                  </Route>
                </Routes>
              </Router>
            </AuthProvider>
          </SnackbarProvider>
        </ThemeProvider>
      </LanguageContext.Provider>
    </ColorModeContext.Provider>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AppContent />
    </I18nextProvider>
  );
}

export default App;
