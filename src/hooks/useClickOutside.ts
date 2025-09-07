import { useEffect, useRef, RefObject } from 'react';

export const useClickOutside = <T extends HTMLElement>(handler: () => void): RefObject<T> => {
  const domNode = useRef<T>(null);

  useEffect(() => {
    const maybeHandler = (event: MouseEvent) => {
      if (domNode.current && !domNode.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', maybeHandler);

    return () => {
      document.removeEventListener('mousedown', maybeHandler);
    };
  }, [handler]);

  return domNode;
};