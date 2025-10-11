import React from 'react';
import './Footer.css';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logo.jpg';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-brandline">
          <Link to="/" className="brand-wrap" aria-label="Go to home">
            <img src={Logo} alt="Faculty Reporting System logo" className="brand-logo" />
            <span className="brand-name">Faculty Reporting System</span>
          </Link>
        </div>

        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-col-title">Product</div>
            <Link to="/" className="footer-link">Home</Link>
            <Link to="/reports" className="footer-link">Reports</Link>
            <Link to="/analytics" className="footer-link">Analytics</Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Account</div>
            <Link to="/profile" className="footer-link">Profile</Link>
            <Link to="/login" className="footer-link">Login</Link>
            <Link to="/register" className="footer-link">Register</Link>
          </div>
          <div className="footer-col">
            <div className="footer-col-title">Resources</div>
            <a href="#" className="footer-link">Help Center</a>
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">© {year} Faculty Reporting System</span>
          <div className="footer-bottom-links">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
