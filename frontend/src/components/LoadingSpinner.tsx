import { CircularProgress } from '@mui/material';
import { useAppTranslation } from '../hooks/useAppTranslation';

export const LoadingSpinner = () => {
  const { t } = useAppTranslation('components');

  return (
    <div>
      <CircularProgress />
      <p>{t('components:loadingSpinner.loading')}</p>
    </div>
  );
}; 