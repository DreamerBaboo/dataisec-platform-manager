import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, TextField, Button, Switch, FormControlLabel } from '@mui/material';
import { useAuth } from '../../utils/auth';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { logger } from '../../utils/logger.ts'; // 導入 logger
const UserProfile = () => {
  const {t} = useAppTranslation(['settings', 'common']);
 
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSubmit = (event) => {
    event.preventDefault();
    // 這裡應該實現更新用戶資料的邏輯
    logger.info('更新用戶資料:', { username, email, darkMode });
  };

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {t('settings:settings.profile.title')}
      </Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('settings:settings.profile.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            disabled
          />
          <TextField
            fullWidth
            label={t('settings:settings.profile.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
          />
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                name="darkMode"
                color="primary"
              />
            }
            label={t('settings:settings.theme.dark')}
          />
          <Box sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" color="primary">
              {t('common:common.save')}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default UserProfile;
