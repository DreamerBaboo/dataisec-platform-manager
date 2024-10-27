import React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Typography, Box, Paper } from '@mui/material';

const columns = [
  { field: 'name', headerName: 'Pod 名稱', width: 200 },
  { field: 'namespace', headerName: '命名空間', width: 150 },
  { field: 'status', headerName: '狀態', width: 120 },
  { field: 'ip', headerName: 'IP', width: 150 },
  { field: 'node', headerName: '節點', width: 200 },
];

const PodList = ({ pods, loading, onRefresh }) => {
  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={onRefresh}>
          刷新
        </Button>
      </Paper>
      <DataGrid
        rows={pods}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5]}
        checkboxSelection
        disableSelectionOnClick
        loading={loading}
      />
    </Box>
  );
};

export default PodList;
