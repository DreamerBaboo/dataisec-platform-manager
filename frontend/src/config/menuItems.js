import { IMAGE_PERMISSIONS } from './permissions';
import StorageIcon from '@mui/icons-material/Storage';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import HealthIcon from '@mui/icons-material/HealthAndSafety';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LayersIcon from '@mui/icons-material/Layers';
import FilterListIcon from '@mui/icons-material/FilterList';

export const menuItems = [
  {
    path: '/images',
    label: '鏡像管理',
    icon: <StorageIcon />,
    permission: IMAGE_PERMISSIONS.VIEW,
    children: [
      {
        path: '/images/list',
        label: '鏡像列表',
        icon: <ListAltIcon />,
        permission: IMAGE_PERMISSIONS.VIEW
      },
      {
        path: '/images/dashboard',
        label: '概覽',
        icon: <DashboardIcon />,
        permission: IMAGE_PERMISSIONS.VIEW
      },
      {
        path: '/images/tags',
        label: '標籤管理',
        icon: <LayersIcon />,
        permission: IMAGE_PERMISSIONS.TAG
      },
      {
        path: '/images/filter',
        label: '高級過濾',
        icon: <FilterListIcon />,
        permission: IMAGE_PERMISSIONS.VIEW
      },
      {
        path: '/images/registry',
        label: 'Registry配置',
        icon: <SettingsIcon />,
        permission: IMAGE_PERMISSIONS.MANAGE
      },
      {
        path: '/images/health',
        label: 'Registry狀態',
        icon: <HealthIcon />,
        permission: IMAGE_PERMISSIONS.MANAGE
      }
    ]
  }
]; 