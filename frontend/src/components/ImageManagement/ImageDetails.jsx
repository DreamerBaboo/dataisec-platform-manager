import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger.ts'; // 導入 logger
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
import { useAppTranslation } from '../../hooks/useAppTranslation';

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
  const { t } = useAppTranslation("imageManagement");
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
          {t('imageManagement:imageManagement.imageDetails.title')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={t('imageManagement:imageManagement.imageDetails.basicInfo')} />
            <Tab label={t('imageManagement:imageManagement.imageDetails.tags')} />
            <Tab label={t('imageManagement:imageManagement.imageDetails.layers')} />
            <Tab label={t('imageManagement:imageManagement.imageDetails.config')} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid2 container spacing={2}>
            <Grid2 item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('imageManagement:imageManagement.imageDetails.id')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {image.id}
              </Typography>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('imageManagement:imageManagement.imageDetails.size')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatSize(image.size)}
              </Typography>
            </Grid2>
            <Grid2 item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('imageManagement:imageManagement.imageDetails.created')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatDate(image.createdAt)}
              </Typography>
            </Grid2>
            {image.details?.platform && (
              <>
                <Grid2 item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('imageManagement:imageManagement.imageDetails.architecture')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {image.details.platform.architecture}
                  </Typography>
                </Grid2>
                <Grid2 item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('imageManagement:imageManagement.imageDetails.os')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {image.details.platform.os}
                  </Typography>
                </Grid2>
              </>
            )}
          </Grid2>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <List>
            {image.repoTags ? (
              image.repoTags.map((tag, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={
                      <Typography variant="body1">
                        <Chip 
                          label={typeof tag === 'object' ? `${tag.repository}:${tag.tag}` : tag}
                          size="small"
                          color="primary"
                          sx={{ maxWidth: '100%' }}
                        />
                      </Typography>
                    }
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body1" color="textSecondary">
                      {t('imageManagement:imageManagement.imageDetails.noTags')}
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {image.details?.layers && (
            <List>
              {image.details.layers.map((layer, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`Layer ${index + 1}`}
                    secondary={
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {layer}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {image.details?.config && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {t('imageManagement:imageManagement.imageDetails.environmentVariables')}
              </Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                {image.details.config.env?.map((env, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {env}
                  </Typography>
                ))}
              </Paper>

              <Typography variant="h6" gutterBottom>
                {t('imageManagement:imageManagement.imageDetails.command')}
              </Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {image.details.config.cmd?.join(' ') || '-'}
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom>
                {t('imageManagement:imageManagement.imageDetails.workdir')}
              </Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {image.details.config.workdir || '-'}
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom>
                {t('imageManagement:imageManagement.imageDetails.exposedPorts')}
              </Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                {Object.keys(image.details.config.exposedPorts || {}).map((port, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {port}
                  </Typography>
                ))}
              </Paper>
            </Box>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {t('imageManagement:actions.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageDetails; 