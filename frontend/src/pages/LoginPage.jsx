import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextField, Button, Paper, Typography, Box, Alert, Select, MenuItem, useTheme } from '@mui/material';
import { useAuth } from '../utils/auth.jsx';
import { useAppTranslation } from '../hooks/useAppTranslation';
import ColorModeContext from '../contexts/ColorModeContext.jsx';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

function LoginPage() {
  const [username, setUsername] = useState('testuser');
  const [password, setPassword] = useState('testpassword');
  const [error, setError] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLanguage, changeLanguage, languages } = useAppTranslation(['auth', 'common']);
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await auth.login(username, password);
      navigate(location.state?.from || '/');
    } catch (error) {
      setError('invalidCredentials');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          bgcolor: 'background.paper'
        }}
      >
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          {t('auth:auth.login.title')}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t(`auth:auth.login.errors.${error}`)}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label={t('auth:auth.login.username')}
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            label={t('auth:auth.login.password')}
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            {t('auth:auth.login.submit')}
          </Button>
        </form>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Select
            value={currentLanguage}
            onChange={(e) => changeLanguage(e.target.value)}
            size="small"
          >
            {Object.entries(languages).map(([code, name]) => (
              <MenuItem key={code} value={code}>
                {name}
              </MenuItem>
            ))}
          </Select>
          
          <Button onClick={colorMode.toggleColorMode}>
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default LoginPage;
