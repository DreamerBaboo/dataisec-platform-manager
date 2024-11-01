import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Badge, Avatar, Box, Select, MenuItem, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuth } from '../../utils/auth';
import { useTranslation } from 'react-i18next';
import { ColorModeContext } from '../../App';

const TopBar = ({ open, drawerWidth, handleDrawerToggle }) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  const handleLanguageChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${open ? drawerWidth : 56}px)` },
        ml: { sm: `${open ? drawerWidth : 56}px` },
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={handleDrawerToggle}
          edge="start"
          sx={{
            marginRight: 2,
            ...(open && { display: 'none' }),
          }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <img src="/path/to/your/logo.png" alt="Logo" style={{ height: 40, marginRight: 16 }} />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('appName')}
          </Typography>
          <Select
            value={i18n.language}
            onChange={handleLanguageChange}
            sx={{ mr: 2, color: 'inherit', '& .MuiSelect-icon': { color: 'inherit' } }}
          >
            <MenuItem value="zh">中文</MenuItem>
            <MenuItem value="en">English</MenuItem>
          </Select>
          <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <IconButton color="inherit">
            <Badge badgeContent={4} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Typography variant="subtitle2" sx={{ mx: 2 }}>
            {user?.username}
          </Typography>
          <Avatar alt={user?.username} src="/static/images/avatar/2.jpg" />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
