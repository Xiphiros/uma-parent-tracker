import { RefObject, useEffect } from 'react';

/**
 * A custom hook that prevents the page from scrolling when the user
 * reaches the top or bottom of a scrollable element.
 * @param ref A React ref attached to the scrollable HTML element.
 * @param enabled A boolean to enable or disable the lock, for conditionally rendered elements.
 */
export const useScrollLock = (ref: RefObject<HTMLElement | null>, enabled: boolean = true) => {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const { deltaY } = e;

      // Scrolling up at the top, and the wheel is moving up
      if (scrollTop === 0 && deltaY < 0) {
        e.preventDefault();
      }

      // Scrolling down at the bottom, and the wheel is moving down
      // Use a 1px buffer for potential floating point inaccuracies
      if (scrollTop + clientHeight >= scrollHeight - 1 && deltaY > 0) {
        e.preventDefault();
      }
    };

    // We use { passive: false } to be able to call preventDefault()
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [ref, enabled]); // Rerun effect if the ref or enabled state changes
};