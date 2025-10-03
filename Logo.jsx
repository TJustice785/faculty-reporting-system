import React from 'react';
import logoImg from '../../assets/logo.jpg';

const Logo = ({ size = 64, rounded = true, alt = 'App Logo', className = '' }) => {
  const dimension = typeof size === 'number' ? `${size}px` : size;
  return (
    <img
      src={logoImg}
      alt={alt}
      width={dimension}
      height={dimension}
      className={`${rounded ? 'rounded-circle' : ''} ${className}`.trim()}
      style={{ objectFit: 'cover' }}
    />
  );
};

export default Logo;
