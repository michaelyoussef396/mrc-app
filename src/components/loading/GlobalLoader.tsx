import logoLoading from '@/assets/logo-loading.png';

interface GlobalLoaderProps {
  loading: boolean;
}

const GlobalLoader = ({ loading }: GlobalLoaderProps) => {
  if (!loading) return null;
  
  return (
    <div className="global-loader">
      <div className="loader-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>
      
      <div className="loader-content">
        {/* Apple-style Spinner */}
        <div className="loader-spinner">
          <svg className="spinner-ring" viewBox="0 0 50 50">
            <circle
              className="spinner-path"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="3"
            />
          </svg>
        </div>
        
        {/* Logo */}
        <div className="loader-logo">
          <img 
            src={logoLoading} 
            alt="MRC Logo" 
            className="w-32 h-32 object-contain animate-pulse"
          />
        </div>
        
        {/* Loading Text */}
        <p className="loader-text">Loading...</p>
      </div>
    </div>
  );
};

export default GlobalLoader;
