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

const ImageDetails = ({ open, onClose, image }) => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (open && image) {
      fetchImageDetails();
    }
  }, [open, image]);

  const fetchImageDetails = async () => {
    console.log('🔍 Fetching details for image:', image);
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/images/${image.id}`);
      console.log('📥 Response:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status);
        throw new Error('Failed to fetch image details');
      }
      
      const data = await response.json();
      console.log('📦 Image details:', data);
      setDetails(data);
    } catch (err) {
      console.error('❌ Error fetching details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          {t('imageDetails')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label={t('basicInfo')} />
                <Tab label={t('layers')} />
                <Tab label={t('history')} />
                <Tab label={t('tags')} />
                <Tab label={t('scanResults')} />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t('name')}
                    </Typography>
                    <Typography variant="body1">
                      {image.name}
                    </Typography>
                  </Box>
                  <Divider />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t('tag')}
                    </Typography>
                    <Typography variant="body1">
                      {image.tag}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t('size')}
                    </Typography>
                    <Typography variant="body1">
                      {formatSize(image.size)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      {t('uploadDate')}
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(image.uploadDate)}
                    </Typography>
                  </Box>
                </Grid>
                {details && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">
                          {t('architecture')}
                        </Typography>
                        <Typography variant="body1">
                          {details.details.architecture}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">
                          {t('os')}
                        </Typography>
                        <Typography variant="body1">
                          {details.details.os}
                        </Typography>
                      </Box>
                    </Grid>
                  </>
                )}
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {details && (
                <List>
                  {details.details.layers.map((layer, index) => (
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
              <Typography variant="body2" color="textSecondary">
                {t('historyComingSoon')}
              </Typography>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={image.tag} color="primary" />
                <Chip label="latest" variant="outlined" />
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <Typography variant="body2" color="textSecondary">
                {t('scanResultsComingSoon')}
              </Typography>
            </TabPanel>
          </>
        )}
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