import { useAppTranslation } from '../hooks/useAppTranslation';

const ErrorBoundary = () => {
  const { t } = useAppTranslation('components');
  
  return (
    <div>
      <h2>{t('components:components.errorBoundary.title')}</h2>
      <p>{t('components:components.errorBoundary.message')}</p>
      <button onClick={() => window.location.reload()}>
        {t('components:components.errorBoundary.retry')}
      </button>
    </div>
  );
};

export default ErrorBoundary; 