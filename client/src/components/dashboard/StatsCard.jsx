import React from 'react';

const StatsCard = ({ title, value, subtitle = '', icon = '', color = 'primary', variant = 'default' }) => {
  const isHero = variant === 'hero';
  return (
    <div className={`card mb-3 ${isHero ? 'card-modern' : ''}`}>
      <div className="card-body">
        <div className="d-flex align-items-center">
          {icon && <i className={`bi ${icon} me-3 text-${color}`} style={{ fontSize: isHero ? 28 : 18 }}></i>}
          <div>
            <div className="small text-muted">{title}</div>
            <div className={isHero ? 'display-6 fw-bold mb-0' : 'fs-4'}>{value}</div>
            {subtitle && <div className="text-muted small mt-1">{subtitle}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
