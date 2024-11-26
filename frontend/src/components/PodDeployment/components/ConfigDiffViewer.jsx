import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert
} from '@mui/material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { generateDiffReport, hasMajorChanges } from '../../../utils/configDiff';
import { logger } from '../../../utils/logger'; // 導入 logger

const ConfigDiffViewer = ({ oldConfig, newConfig }) => {
  const { t } = useAppTranslation();
  const { changes, summary } = generateDiffReport(oldConfig, newConfig);
  const hasMajor = hasMajorChanges(oldConfig, newConfig);

  const formatValue = (value) => {
    if (value === undefined) return '已刪除';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return value.toString();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.diff.title')}
      </Typography>

      {hasMajor && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('podDeployment:podDeployment.diff.majorChanges')}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('podDeployment:podDeployment.diff.summary')}
        </Typography>
        <Typography>
          {t('podDeployment:podDeployment.diff.totalChanges', { count: summary.total })}
        </Typography>
      </Box>

      <Paper sx={{ p: 2 }}>
        <List>
          {changes.map((change, index) => (
            <ListItem key={index} divider={index < changes.length - 1}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{change.path}</Typography>
                    <Chip
                      size="small"
                      color={change.value === undefined ? 'error' : 'primary'}
                      label={change.value === undefined ? t('podDeployment:podDeployment.diff.deleted') : t('podDeployment:podDeployment.diff.modified')}
                    />
                  </Box>
                }
                secondary={formatValue(change.value)}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default ConfigDiffViewer; 