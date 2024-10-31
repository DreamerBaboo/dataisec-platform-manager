import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
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
            <Tab label={t('tags')} />
            <Tab label={t('layers')} />
            <Tab label={t('config')} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('id')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {image.id}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('size')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatSize(image.size)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                {t('created')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {formatDate(image.createdAt)}
              </Typography>
            </Grid>
            {image.details?.platform && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('architecture')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {image.details.platform.architecture}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {t('os')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {image.details.platform.os}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
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
                          label={tag}
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
                      {t('noTags')}
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
              <Typography variant="h6" gutterBottom>環境變量</Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                {image.details.config.env?.map((env, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {env}
                  </Typography>
                ))}
              </Paper>

              <Typography variant="h6" gutterBottom>命令</Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {image.details.config.cmd?.join(' ') || '-'}
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom>工作目錄</Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {image.details.config.workdir || '-'}
                </Typography>
              </Paper>

              <Typography variant="h6" gutterBottom>暴露端口</Typography>
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
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageDetails; 