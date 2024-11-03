import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';   

const DeploymentPreview = ({ data, config }) => {
  const { t } = useAppTranslation();

  if (!data) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.preview.title')}
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('podDeployment:podDeployment.preview.field')}</TableCell>
                <TableCell>{t('podDeployment:podDeployment.preview.value')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{t('podDeployment:podDeployment.preview.name')}</TableCell>
                <TableCell>{config.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('podDeployment:podDeployment.preview.namespace')}</TableCell>
                <TableCell>{config.namespace}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('podDeployment:podDeployment.preview.type')}</TableCell>
                <TableCell>{config.type}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('podDeployment:podDeployment.preview.image')}</TableCell>
                <TableCell>{`${config.image.repository}:${config.image.tag}`}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('podDeployment:podDeployment.preview.replicas')}</TableCell>
                <TableCell>{config.replicas}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="subtitle1" gutterBottom>
        {t('podDeployment:podDeployment.preview.yaml')}
      </Typography>
      <Paper sx={{ p: 2 }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {data.yaml}
        </pre>
      </Paper>
    </Box>
  );
};

export default DeploymentPreview; 