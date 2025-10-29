import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PasswordChanged() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [autoRedirect, setAutoRedirect] = useState(true);
  
  useEffect(() => {
    if (!autoRedirect || countdown === 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown, autoRedirect, navigate]);
  
  const handleLoginNow = () => {
    setAutoRedirect(false);
    navigate('/');
  };
  
  return (
    <div className="password-changed-page">
      {/* Blue Animated Background */}
      <div className="password-changed-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
      </div>
      
      {/* Celebration Confetti */}
      <div className="confetti-container">
        {[...Array(30)].map((_, i) => (
          <div key={i} className={`confetti confetti-${(i % 10) + 1}`}></div>
        ))}
      </div>
      
      {/* Content Card */}
      <div className="password-changed-container">
        <div className="password-changed-card glass-card">
          {/* Large Success Icon */}
          <div className="success-icon-wrapper">
            <div className="success-icon-circle">
              <svg 
                className="checkmark-svg" 
                viewBox="0 0 52 52"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle 
                  className="checkmark-circle" 
                  cx="26" 
                  cy="26" 
                  r="25" 
                  fill="none"
                />
                <path 
                  className="checkmark-check" 
                  fill="none" 
                  d="M14.1 27.2l7.1 7.2 16.7-16.8"
                />
              </svg>
            </div>
          </div>
          
          {/* Header */}
          <div className="password-changed-header">
            <h1 className="success-title">Password Changed!</h1>
            <p className="success-message">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
          </div>
          
          {/* Success Details */}
          <div className="success-details">
            <div className="detail-item">
              <div className="detail-icon-circle green">
                <span>✓</span>
              </div>
              <span className="detail-text">Password successfully updated</span>
            </div>
            <div className="detail-item">
              <div className="detail-icon-circle blue">
                <span>🔒</span>
              </div>
              <span className="detail-text">Your account is secure</span>
            </div>
            <div className="detail-item">
              <div className="detail-icon-circle purple">
                <span>🔑</span>
              </div>
              <span className="detail-text">Use your new password to login</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="password-changed-actions">
            <button 
              className="btn-primary btn-login-now"
              onClick={handleLoginNow}
            >
              <span>Sign In Now</span>
              <span className="btn-arrow">→</span>
            </button>
            
            {/* Auto-redirect Indicator */}
            {autoRedirect && countdown > 0 && (
              <div className="auto-redirect-notice">
                <div className="countdown-wrapper">
                  <div className="countdown-circle">
                    <svg className="countdown-ring" viewBox="0 0 36 36">
                      <path
                        className="countdown-background"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="countdown-progress"
                        strokeDasharray={`${(countdown / 5) * 100}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="countdown-number">{countdown}</span>
                  </div>
                  <div className="redirect-content">
                    <p className="redirect-text">
                      Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}
                    </p>
                    <button 
                      className="cancel-redirect-btn"
                      onClick={() => setAutoRedirect(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Security Tip */}
          <div className="security-tip">
            <div className="tip-icon">💡</div>
            <div className="tip-content">
              <h3 className="tip-title">Security Tip</h3>
              <p className="tip-text">
                Make sure to use a unique password that you don't use on other websites. Consider using a password manager to keep track of your passwords securely.
              </p>
            </div>
          </div>
          
          {/* Footer Links */}
          <div className="password-changed-footer">
            <button onClick={() => navigate('/')} className="footer-link">
              Go to Login
            </button>
            <span className="footer-divider">•</span>
            <button onClick={() => navigate('/dashboard')} className="footer-link">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
