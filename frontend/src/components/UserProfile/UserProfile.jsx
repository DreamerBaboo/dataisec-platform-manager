import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, TextField, Button, Switch, FormControlLabel } from '@mui/material';
import { useAuth } from '../../utils/auth';

const UserProfile = () => {
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
    console.log('更新用戶資料:', { username, email, darkMode });
  };

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        用戶資料
      </Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="用戶名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            disabled
          />
          <TextField
            fullWidth
            label="電子郵件"
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
            label="深色模式"
          />
          <Box sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" color="primary">
              保存更改
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default UserProfile;
