import { useState, useRef, useCallback } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export function useScrollToHideNav() {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10; // Minimum scroll distance to trigger hide/show

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';
    
    // Only hide/show if scrolled enough distance
    if (Math.abs(currentScrollY - lastScrollY.current) > scrollThreshold) {
      if (scrollDirection === 'down' && currentScrollY > 50) {
        // Scrolling down and past initial content - hide nav
        setIsNavVisible(false);
      } else if (scrollDirection === 'up') {
        // Scrolling up - show nav
        setIsNavVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    }
  }, []);

  return {
    isNavVisible,
    handleScroll,
  };
}
