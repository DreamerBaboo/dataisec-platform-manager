import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Checkbox,
  IconButton,
  Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UploadIcon from '@mui/icons-material/Upload';

const PodManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pods, setPods] = useState([]);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [selectedPodType, setSelectedPodType] = useState('');

  useEffect(() => {
    fetchPods();
  }, []);

  const fetchPods = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/pods', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPods(data);
    } catch (error) {
      console.error('Failed to fetch pods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = filteredPods.map((pod) => pod.metadata.uid);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, uid) => {
    const selectedIndex = selected.indexOf(uid);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, uid);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreatePod = () => {
    navigate('/pods/create');
  };

  const handleEditPod = (pod) => {
    navigate(`/pods/edit/${pod.metadata.uid}`, { state: { pod } });
  };

  const handleDeletePods = async () => {
    // 實現刪除邏輯
    console.log('Deleting pods:', selected);
  };

  const handleUploadImage = () => {
    // 實現上傳鏡像邏輯
    console.log('Upload image clicked');
  };

  const filteredPods = pods.filter(pod => {
    return (
      pod.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedNamespace ? pod.metadata.namespace === selectedNamespace : true) &&
      (selectedPodType ? pod.type === selectedPodType : true)
    );
  });

  const sortedPods = React.useMemo(() => {
    const comparator = (a, b) => {
      if (orderBy === 'name') {
        return order === 'asc'
          ? a.metadata.name.localeCompare(b.metadata.name)
          : b.metadata.name.localeCompare(a.metadata.name);
      }
      // Add other sort cases here
      return 0;
    };
    return [...filteredPods].sort(comparator);
  }, [filteredPods, order, orderBy]);

  const isSelected = (uid) => selected.indexOf(uid) !== -1;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          {t('podManagement')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchPods}
          disabled={loading}
        >
          {loading ? t('refreshing') : t('refresh')}
        </Button>
      </Box>

      {/* 搜索和過濾部分 */}
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label={t('searchPods')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>{t('namespace')}</InputLabel>
              <Select
                value={selectedNamespace}
                label={t('namespace')}
                onChange={(e) => setSelectedNamespace(e.target.value)}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                {/* Add namespace options */}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>{t('podType')}</InputLabel>
              <Select
                value={selectedPodType}
                label={t('podType')}
                onChange={(e) => setSelectedPodType(e.target.value)}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                <MenuItem value="statefulset">{t('statefulSet')}</MenuItem>
                <MenuItem value="daemonset">{t('daemonSet')}</MenuItem>
                <MenuItem value="deployment">{t('deployment')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Pod 列表部分 */}
      <Paper elevation={3} sx={{ width: '100%', mb: 2 }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < filteredPods.length}
                    checked={filteredPods.length > 0 && selected.length === filteredPods.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    {t('podName')}
                  </TableSortLabel>
                </TableCell>
                <TableCell>{t('namespace')}</TableCell>
                <TableCell>{t('podType')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedPods
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((pod) => {
                  const isItemSelected = isSelected(pod.metadata.uid);
                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={pod.metadata.uid}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isItemSelected}
                          onClick={(event) => handleClick(event, pod.metadata.uid)}
                        />
                      </TableCell>
                      <TableCell>{pod.metadata.name}</TableCell>
                      <TableCell>{pod.metadata.namespace}</TableCell>
                      <TableCell>{pod.type}</TableCell>
                      <TableCell>{pod.status}</TableCell>
                      <TableCell>
                        <Tooltip title={t('edit')}>
                          <IconButton onClick={() => handleEditPod(pod)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredPods.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* 操作按鈕部分 */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-start' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreatePod}
        >
          {t('createPod')}
        </Button>
        {selected.length > 0 && (
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeletePods}
          >
            {t('deletePods')}
          </Button>
        )}
        <Button
          variant="contained"
          color="secondary"
          startIcon={<UploadIcon />}
          onClick={handleUploadImage}
        >
          {t('uploadImage')}
        </Button>
      </Box>
    </Box>
  );
};

export default PodManagement;
