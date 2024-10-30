import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Chip,
  Paper
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

const ImageFilter = ({ onFilter }) => {
  const [filters, setFilters] = useState({
    name: '',
    tag: '',
    size: 'all'
  });

  const handleChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value
    };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      name: '',
      tag: '',
      size: 'all'
    };
    setFilters(clearedFilters);
    onFilter(clearedFilters);
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="鏡像名稱"
          value={filters.name}
          onChange={handleChange('name')}
          size="small"
        />
        
        <TextField
          label="標籤"
          value={filters.tag}
          onChange={handleChange('tag')}
          size="small"
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>大小</InputLabel>
          <Select
            value={filters.size}
            label="大小"
            onChange={handleChange('size')}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="large">大於1GB</MenuItem>
            <MenuItem value="medium">100MB-1GB</MenuItem>
            <MenuItem value="small">小於100MB</MenuItem>
          </Select>
        </FormControl>

        <IconButton onClick={clearFilters} size="small">
          <ClearIcon />
        </IconButton>
      </Box>

      {Object.entries(filters).some(([_, value]) => value && value !== 'all') && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          {filters.name && (
            <Chip 
              label={`名稱: ${filters.name}`}
              onDelete={() => handleChange('name')({ target: { value: '' } })}
              size="small"
            />
          )}
          {filters.tag && (
            <Chip 
              label={`標籤: ${filters.tag}`}
              onDelete={() => handleChange('tag')({ target: { value: '' } })}
              size="small"
            />
          )}
          {filters.size !== 'all' && (
            <Chip 
              label={`大小: ${filters.size}`}
              onDelete={() => handleChange('size')({ target: { value: 'all' } })}
              size="small"
            />
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ImageFilter; 