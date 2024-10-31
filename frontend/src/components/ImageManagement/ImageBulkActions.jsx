import React from 'react';
import {
  Button,
  ButtonGroup,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { usePermissions } from '../../hooks/usePermissions';
import { IMAGE_PERMISSIONS } from '../../config/permissions';

const ImageBulkActions = ({ selectedImages, onDelete, onPush }) => {
  const { hasPermission } = usePermissions();

  if (!selectedImages?.length) return null;

  return (
    <ButtonGroup variant="contained" sx={{ mb: 2 }}>
      {hasPermission(IMAGE_PERMISSIONS.PUSH) && (
        <Tooltip title="批量推送">
          <Button
            startIcon={<CloudUploadIcon />}
            onClick={onPush}
          >
            推送 ({selectedImages.length})
          </Button>
        </Tooltip>
      )}
      
      {hasPermission(IMAGE_PERMISSIONS.DELETE) && (
        <Tooltip title="批量刪除">
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={onDelete}
          >
            刪除 ({selectedImages.length})
          </Button>
        </Tooltip>
      )}
    </ButtonGroup>
  );
};

export default ImageBulkActions; 