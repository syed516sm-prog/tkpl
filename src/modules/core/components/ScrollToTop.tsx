import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Sends every page change back to the top, like a normal website. */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};