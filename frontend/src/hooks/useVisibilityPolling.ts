import { useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

interface PollingOptions {
  interval?: number;
  onVisible?: () => void;
  onHidden?: () => void;
}

export function useVisibilityPolling(
  pollingFunction: () => Promise<void> | void,
  { interval = 30000, onVisible, onHidden }: PollingOptions = {}
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  const clearPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNextPoll = useCallback(() => {
    if (isVisibleRef.current) {
      timeoutRef.current = setTimeout(async () => {
        try {
          await pollingFunction();
        } catch (error) {
          logger.error('Polling error:', error);
        }
        scheduleNextPoll();
      }, interval);
    }
  }, [pollingFunction, interval]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      logger.info('Page hidden, stopping polling');
      isVisibleRef.current = false;
      clearPolling();
      onHidden?.();
    } else {
      logger.info('Page visible, resuming polling');
      isVisibleRef.current = true;
      pollingFunction();
      scheduleNextPoll();
      onVisible?.();
    }
  }, [pollingFunction, scheduleNextPoll, clearPolling, onHidden, onVisible]);

  useEffect(() => {
    // 初始化輪詢
    pollingFunction();
    scheduleNextPoll();

    // 添加可見性變化監聽器
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollingFunction, scheduleNextPoll, handleVisibilityChange, clearPolling]);

  return { clearPolling };
}
