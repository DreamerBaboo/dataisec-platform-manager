import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Collapse
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  Description as LogIcon,
  Person as PersonIcon,
  ExpandLess,
  ExpandMore,
  Image as ImageIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SideMenu = ({ open, toggleDrawer }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [imageMenuOpen, setImageMenuOpen] = React.useState(false);

  const menuItems = [
    {
      text: 'dashboard',
      icon: <DashboardIcon />,
      path: '/'
    },
    {
      text: 'podDashboard',
      icon: <StorageIcon />,
      path: '/pod-dashboard'
    },
    {
      text: 'podManagement',
      icon: <StorageIcon />,
      path: '/pods'
    },
    {
      text: 'imageManagement',
      icon: <ImageIcon />,
      subItems: [
        {
          text: 'imageList',
          icon: <ImageIcon />,
          path: '/images'
        },
        {
          text: 'uploadImage',
          icon: <UploadIcon />,
          path: '/images/upload'
        }
      ]
    },
    {
      text: 'logs',
      icon: <LogIcon />,
      path: '/logs'
    },
    {
      text: 'profile',
      icon: <PersonIcon />,
      path: '/profile'
    }
  ];

  const handleClick = (item) => {
    console.log('handleClick called with item:', item);
    if (item.subItems) {
      if (item.text === 'imageManagement') {
        console.log('Toggling imageMenuOpen from', imageMenuOpen, 'to', !imageMenuOpen);
        setImageMenuOpen(!imageMenuOpen);
      }
    } else {
      console.log('Navigating to path:', item.path);
      navigate(item.path);
    }
  };

  const isSelected = (path) => {
    const selected = location.pathname === path;
    console.log('isSelected check:', { path, currentPath: location.pathname, selected });
    return selected;
  };

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
          whiteSpace: 'nowrap',
          overflowX: 'hidden',
          transition: theme => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Box sx={{ mt: 8 }}>
        <List>
          {menuItems.map((item) => (
            <React.Fragment key={item.text}>
              <ListItem
                button
                onClick={() => handleClick(item)}
                selected={item.path ? isSelected(item.path) : false}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
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
                  primary={t(item.text)} 
                  sx={{ opacity: open ? 1 : 0 }}
                />
                {item.subItems && open && (
                  item.text === 'imageManagement' ? 
                    imageMenuOpen ? <ExpandLess /> : <ExpandMore /> 
                    : null
                )}
              </ListItem>
              {item.subItems && (
                <Collapse in={imageMenuOpen && open} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItem
                        key={subItem.text}
                        button
                        onClick={() => navigate(subItem.path)}
                        selected={isSelected(subItem.path)}
                        sx={{ pl: 4 }}
                      >
                        <ListItemIcon>{subItem.icon}</ListItemIcon>
                        <ListItemText primary={t(subItem.text)} />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
              {item.divider && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default SideMenu;
