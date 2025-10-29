import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ProgressBar = () => {
  const [progress, setProgress] = useState(0);
  const location = useLocation();
  
  useEffect(() => {
    setProgress(0);
    
    // Simulate progress
    const timer1 = setTimeout(() => setProgress(30), 100);
    const timer2 = setTimeout(() => setProgress(60), 300);
    const timer3 = setTimeout(() => setProgress(100), 500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location]);
  
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar" 
        style={{ 
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1
        }}
      />
    </div>
  );
};

export default ProgressBar;
