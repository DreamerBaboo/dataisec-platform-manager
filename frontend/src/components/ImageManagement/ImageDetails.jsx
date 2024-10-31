import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid2,
  Divider,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';

// Tab Panel 組件
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`image-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ImageDetails = ({ image, open, onClose }) => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (!image) return null;

  const formatSize = (bytes) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return `${Math.round(bytes / (1024 ** i), 2)} ${sizes[i]}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          {t('imageDetails')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={t('basicInfo')} />
            <Tab label={t('layers')} />
            <Tab label={t('config')} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid2 container spacing={2}>
            <Grid2 item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('id')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {image.id}
              </Typography>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('name')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {image.name}
              </Typography>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('tag')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {image.tag}
              </Typography>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('size')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatSize(image.size)}
              </Typography>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('created')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatDate(image.createdAt)}
              </Typography>
            </Grid2>
            {image.details && (
              <>
                <Grid2 item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('architecture')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {image.details.architecture}
                  </Typography>
                </Grid2>
                <Grid2 item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('os')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {image.details.os}
                  </Typography>
                </Grid2>
              </>
            )}
          </Grid2>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {image.details?.layers && (
            <List>
              {image.details.layers.map((layer, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`Layer ${index + 1}`}
                    secondary={layer}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {image.details?.config && (
            <pre style={{ 
              overflow: 'auto', 
              backgroundColor: '#f5f5f5',
              padding: '1rem',
              borderRadius: '4px'
            }}>
              {JSON.stringify(image.details.config, null, 2)}
            </pre>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageDetails; 