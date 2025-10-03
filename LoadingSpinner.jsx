import React from 'react';

const LoadingSpinner = () => (
  <div className="spinner-wrap">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

export default LoadingSpinner;
