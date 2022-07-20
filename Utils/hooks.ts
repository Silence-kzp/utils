import { useState, useEffect } from 'react';
import debounce from 'lodash.debounce';

export function useMediaQuery(mediaQuery: string) {
    if (!(typeof window !== 'undefined' && window.document && window.document.createElement)) {
      return false
    }
  
    const [isVerified, setIsVerified] = useState(!!window.matchMedia(mediaQuery).matches)
  
    useEffect(() => {
      const mediaQueryList = window.matchMedia(mediaQuery)
      const documentChangeHandler = debounce(() => {
            setIsVerified(!!mediaQueryList.matches)
        }, { delay: 450 })
  
      try {
        mediaQueryList.addEventListener('change', documentChangeHandler)
      } catch (e) {
        // Safari isn't supporting mediaQueryList.addEventListener
        mediaQueryList.addListener(documentChangeHandler)
      }
  
      documentChangeHandler()
      return () => {
        try {
          mediaQueryList.removeEventListener('change', documentChangeHandler)
        } catch (e) {
          // Safari isn't supporting mediaQueryList.removeEventListener
          mediaQueryList.removeListener(documentChangeHandler)
        }
      }
    }, [mediaQuery])
  
    return isVerified
}
