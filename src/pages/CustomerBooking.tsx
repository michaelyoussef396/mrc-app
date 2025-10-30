import { useParams } from "react-router-dom";
import Logo from "@/components/Logo";

const CustomerBooking = () => {
  const { token } = useParams();
  
  // For /book/demo - ONLY show error page
  if (token === 'demo') {
    return (
      <div className="expired-page">
        <div className="expired-container">
          <div className="expired-header">
            <Logo size="medium" variant="light" />
            <h1>Book Your Remediation</h1>
            <p className="contact-number">1300 665 673</p>
          </div>

          <div className="expired-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Booking Link Expired</h2>
            
            <p className="error-message">
              This booking link has expired or is invalid.
            </p>
            
            <p className="error-info">
              Booking links are valid for 30 days from the report date.
            </p>

            <div className="contact-section">
              <p className="contact-heading">Please contact us to receive a new link:</p>
              
              <a href="tel:1300665673" className="contact-item">
                <span className="contact-icon">📞</span>
                <span className="contact-text">
                  <strong>Phone:</strong> 1300 665 673
                </span>
              </a>
              
              <a href="mailto:info@mrc.com.au" className="contact-item">
                <span className="contact-icon">📧</span>
                <span className="contact-text">
                  <strong>Email:</strong> info@mrc.com.au
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Any other token redirects to demo error page
  return (
    <div className="expired-page">
      <div className="expired-container">
        <div className="expired-header">
          <Logo size="medium" variant="light" />
          <h1>Book Your Remediation</h1>
          <p className="contact-number">1300 665 673</p>
        </div>

        <div className="expired-content">
          <div className="error-icon">⚠️</div>
          <h2 className="error-title">Invalid Booking Link</h2>
          
          <p className="error-message">
            We couldn't find a booking associated with this link.
          </p>
          
          <p className="error-info">
            Please check the link in your email or contact us for assistance.
          </p>

          <div className="contact-section">
            <p className="contact-heading">Need help?</p>
            
            <a href="tel:1300665673" className="contact-item">
              <span className="contact-icon">📞</span>
              <span className="contact-text">
                <strong>Phone:</strong> 1300 665 673
              </span>
            </a>
            
            <a href="mailto:info@mrc.com.au" className="contact-item">
              <span className="contact-icon">📧</span>
              <span className="contact-text">
                <strong>Email:</strong> info@mrc.com.au
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerBooking;
