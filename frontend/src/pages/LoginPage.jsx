import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextField, Button, Paper, Typography, Box, Alert, Select, MenuItem, useTheme } from '@mui/material';
import { useAuth } from '../utils/auth.jsx';
import { useTranslation } from 'react-i18next';
import { ColorModeContext } from '../App';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

function LoginPage() {
  const [username, setUsername] = useState('testuser'); // 設置默認用戶名
  const [password, setPassword] = useState('testpassword'); // 設置默認密碼
  const [error, setError] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await auth.login(username, password);
      const { from } = location.state || { from: { pathname: "/" } };
      navigate(from);
    } catch (error) {
      setError(t('loginFailed') + ': ' + error.message);
    }
  };

  const handleLanguageChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Paper elevation={3} sx={{ padding: 4, width: 350, backgroundColor: theme.palette.background.paper }}>
        <Typography variant="h5" component="h1" gutterBottom align="center" color="textPrimary">
          {t('appName')}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Select
            value={i18n.language}
            onChange={handleLanguageChange}
            sx={{ width: '45%' }}
          >
            <MenuItem value="zh">中文</MenuItem>
            <MenuItem value="en">English</MenuItem>
          </Select>
          <Button
            onClick={colorMode.toggleColorMode}
            color="inherit"
            sx={{ width: '45%' }}
          >
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            {theme.palette.mode === 'dark' ? t('lightMode') : t('darkMode')}
          </Button>
        </Box>
        <form onSubmit={handleSubmit}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label={t('username')}
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            InputLabelProps={{
              style: { color: theme.palette.text.secondary },
            }}
          />
          <TextField
            label={t('password')}
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputLabelProps={{
              style: { color: theme.palette.text.secondary },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            {t('login')}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default LoginPage;
