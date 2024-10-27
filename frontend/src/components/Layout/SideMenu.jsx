import React, { useState, useEffect, useRef } from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Box, IconButton, Collapse, useTheme } from '@mui/material';
import { Dashboard as DashboardIcon, Storage as StorageIcon, Assignment as LogIcon, Person as ProfileIcon, ChevronLeft, ChevronRight, ExpandLess, ExpandMore } from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const MIN_DRAWER_WIDTH = 56;
const MAX_DRAWER_WIDTH = 300;

const SideMenu = ({ open, toggleDrawer }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const [drawerWidth, setDrawerWidth] = useState(open ? 240 : MIN_DRAWER_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);
  const [dashboardOpen, setDashboardOpen] = useState(true);

  const menuItems = [
    {
      text: t('dashboard'),
      icon: <DashboardIcon />,
      path: '/',
      subItems: [
        { text: t('systemDashboard'), path: '/' },
        { text: t('podDashboard'), path: '/pod-dashboard' }
      ]
    },
    { text: t('podManagement'), icon: <StorageIcon />, path: '/pods' },
    { text: t('systemLogs'), icon: <LogIcon />, path: '/logs' },
    { text: t('userProfile'), icon: <ProfileIcon />, path: '/profile' },
  ];

  useEffect(() => {
    setDrawerWidth(open ? 240 : MIN_DRAWER_WIDTH);
  }, [open]);

  const handleMouseDown = (e) => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > MIN_DRAWER_WIDTH && newWidth < MAX_DRAWER_WIDTH) {
        setDrawerWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    setIsResizing(false);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDashboardClick = () => {
    setDashboardOpen(!dashboardOpen);
  };

  return (
    <>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            height: '100%',
            transition: isResizing ? 'none' : theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
          },
        }}
      >
        <List sx={{ flexGrow: 1, mt: 8, pr: 0.5 }}>
          {menuItems.map((item) => (
            <React.Fragment key={item.text}>
              <ListItem
                onClick={item.subItems ? handleDashboardClick : undefined}
                component={item.subItems ? 'div' : Link}
                to={item.subItems ? undefined : item.path}
                selected={location.pathname === item.path}
                sx={{ 
                  justifyContent: open ? 'initial' : 'center',
                  px: 1.5,
                  color: theme.palette.text.primary,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.action.selected,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 0, 
                  mr: open ? 2 : 'auto', 
                  justifyContent: 'center',
                  color: theme.palette.text.primary,
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    opacity: open ? 1 : 0,
                    color: theme.palette.text.primary,
                  }} 
                />
                {item.subItems && open && (dashboardOpen ? <ExpandLess /> : <ExpandMore />)}
              </ListItem>
              {item.subItems && (
                <Collapse in={dashboardOpen && open} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItem
                        key={subItem.text}
                        component={Link}
                        to={subItem.path}
                        selected={location.pathname === subItem.path}
                        sx={{ 
                          pl: 4,
                          color: theme.palette.text.primary,
                          '&.Mui-selected': {
                            backgroundColor: theme.palette.action.selected,
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          },
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <ListItemText primary={subItem.text} />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
        <Box sx={{ position: 'absolute', bottom: 0, right: 0, p: 0.5 }}>
          <IconButton onClick={toggleDrawer} sx={{ 
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}>
            {open ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </Box>
      </Drawer>
      <Box
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          left: drawerWidth,
          top: 0,
          bottom: 0,
          width: '5px',
          cursor: 'ew-resize',
          zIndex: theme.zIndex.drawer + 2,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      />
    </>
  );
};

export default SideMenu;
