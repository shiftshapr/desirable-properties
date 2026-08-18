import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_IDLE_MS = 1200;

/**
 * Show UI on cursor movement; fade after idle timeout.
 * Stays visible while the target element is hovered (e.g. prompt stack rail).
 */
export function useCursorActivityVisibility(enabled = true, idleMs = DEFAULT_IDLE_MS) {
  const [activityVisible, setActivityVisible] = useState(false);
  const [targetHovered, setTargetHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setActivityVisible(false);
    }, idleMs);
  }, [clearTimer, idleMs]);

  useEffect(() => {
    if (!enabled) {
      setActivityVisible(false);
      setTargetHovered(false);
      clearTimer();
      return;
    }

    const onMouseMove = () => {
      setActivityVisible(true);
      scheduleHide();
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      clearTimer();
    };
  }, [enabled, scheduleHide, clearTimer]);

  const onTargetEnter = useCallback(() => {
    setTargetHovered(true);
    clearTimer();
  }, [clearTimer]);

  const onTargetLeave = useCallback(() => {
    setTargetHovered(false);
    if (activityVisible) scheduleHide();
  }, [activityVisible, scheduleHide]);

  return {
    visible: enabled && (activityVisible || targetHovered),
    targetPointerHandlers: {
      onMouseEnter: onTargetEnter,
      onMouseLeave: onTargetLeave,
    },
  };
}
