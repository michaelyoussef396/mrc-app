import { useNavigate } from 'react-router-dom';

export default function PasswordChanged() {
  const navigate = useNavigate();
  
  const handleSignIn = () => {
    navigate('/dashboard');
  };
  
  return (
    <div className="password-success-page">
      <div className="password-success-container">
        
        {/* Success Icon - Clean and Elegant */}
        <div className="success-icon-area">
          <div className="success-icon-bg">
            <svg className="success-checkmark" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
        </div>

        {/* Main Content - Simple and Clear */}
        <div className="success-content">
          <h1 className="success-title">Password Changed</h1>
          <p className="success-message">
            Your password has been updated successfully
          </p>
        </div>

        {/* Clean CTA Button */}
        <button className="success-cta-button" onClick={handleSignIn}>
          <span>Continue to Dashboard</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 15l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Subtle Footer Link */}
        <div className="success-footer">
          <a href="/" className="back-to-login">← Back to Login</a>
        </div>

      </div>
    </div>
  );
}
