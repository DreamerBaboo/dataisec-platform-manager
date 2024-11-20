import React from 'react';
import { logger } from '../../../utils/logger.ts'; 
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../hooks/useAppTranslation'; 
import { ERROR_TYPES } from '../../utils/errorHandler';

const ErrorDisplay = ({ error, onClose }) => {
  const { t } = useAppTranslation();

  if (!error) return null;

  const getAlertSeverity = (errorType) => {
    switch (errorType) {
      case ERROR_TYPES.VALIDATION:
        return 'warning';
      case ERROR_TYPES.PERMISSION:
        return 'error';
      case ERROR_TYPES.NETWORK:
        return 'error';
      case ERROR_TYPES.KUBERNETES:
        return 'error';
      default:
        return 'error';
    }
  };

  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case ERROR_TYPES.VALIDATION:
        return <WarningIcon />;
      case ERROR_TYPES.PERMISSION:
        return <ErrorIcon />;
      case ERROR_TYPES.NETWORK:
        return <ErrorIcon />;
      case ERROR_TYPES.KUBERNETES:
        return <ErrorIcon />;
      default:
        return <InfoIcon />;
    }
  };

  return (
    <Collapse in={Boolean(error)}>
      <Alert
        severity={getAlertSeverity(error.type)}
        icon={getErrorIcon(error.type)}
        action={
          onClose && (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={onClose}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          )
        }
        sx={{ mb: 2 }}
      >
        <AlertTitle>
          {t(`errors.types.${error.type}`)}
        </AlertTitle>
        <Typography variant="body2">
          {error.message}
        </Typography>
        {error.details && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {typeof error.details === 'string' 
                ? error.details 
                : JSON.stringify(error.details, null, 2)}
            </Typography>
          </Box>
        )}
      </Alert>
    </Collapse>
  );
};

export default ErrorDisplay; 