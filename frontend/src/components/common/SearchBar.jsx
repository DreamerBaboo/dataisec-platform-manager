import React from 'react';
import { logger } from '../../../utils/logger.ts'; 
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

const SearchBar = ({ 
  value, 
  onChange, 
  onClear, 
  placeholder, 
  fullWidth = true,
  size = "small",
  sx = {}
}) => {
  return (
    <Paper 
      elevation={0} 
      variant="outlined"
      sx={{ 
        display: 'flex',
        alignItems: 'center',
        p: '2px 4px',
        ...sx
      }}
    >
      <InputAdornment position="start" sx={{ pl: 1 }}>
        <SearchIcon color="action" />
      </InputAdornment>
      <TextField
        fullWidth={fullWidth}
        size={size}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        variant="standard"
        InputProps={{
          disableUnderline: true,
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={onClear}
                edge="end"
                sx={{ mr: -1 }}
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ) : null
        }}
        sx={{
          '& .MuiInputBase-root': {
            px: 1
          }
        }}
      />
    </Paper>
  );
};

export default SearchBar; 