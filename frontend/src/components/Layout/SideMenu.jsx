import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Paper,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Article as ArticleIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../hooks/useAppTranslation';

const SideMenu = ({ open, toggleDrawer }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { t } = useAppTranslation();

  const menuItems = [
    { path: '/', icon: <DashboardIcon />, text: t('components.sideMenu.dashboard') },
    { path: '/pod-dashboard', icon: <AssessmentIcon />, text: t('components.sideMenu.podDashboard') },
    // { path: '/pods', icon: <MemoryIcon />, text: t('components.sideMenu.podManagement') },
    { path: '/pod-deployment', icon: <StorageIcon />, text: t('components.sideMenu.podDeployment') },
    { path: '/images', icon: <CloudUploadIcon />, text: t('components.sideMenu.imageManagement') },
    { path: '/logs', icon: <ArticleIcon />, text: t('components.sideMenu.logs') },
    { path: '/profile', icon: <PersonIcon />, text: t('components.sideMenu.profile') }
  ];

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? 240 : 56,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 240 : 56,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ mt: ['48px', '56px', '64px'] }}>
        <Paper elevation={0}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                key={item.path}
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main + '20',
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    opacity: open ? 1 : 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} 
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Drawer>
  );
};

export default SideMenu;
