import { useState, useEffect, ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  location: string;
}

const PageTransition = ({ children, location }: PageTransitionProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);
  
  useEffect(() => {
    if (location !== displayLocation) {
      setIsTransitioning(true);
      
      // Fade out
      setTimeout(() => {
        setDisplayLocation(location);
        
        // Fade in
        setTimeout(() => {
          setIsTransitioning(false);
        }, 150);
      }, 150);
    }
  }, [location, displayLocation]);
  
  return (
    <>
      {isTransitioning && (
        <div className="page-transition-overlay">
          <div className="transition-spinner">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
        </div>
      )}
      
      <div className={`page-content ${isTransitioning ? 'transitioning' : ''}`}>
        {children}
      </div>
    </>
  );
};

export default PageTransition;
