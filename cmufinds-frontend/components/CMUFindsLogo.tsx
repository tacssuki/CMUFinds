import React from 'react';

type LogoProps = {
  variant?: 'shield' | 'pin' | 'simple' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

export const CMUFindsLogo: React.FC<LogoProps> = ({ 
  variant = 'shield', 
  size = 'md',
  className = ''
}) => {
  // Define sizes
  const sizes = {
    sm: { width: 32, height: 32, fontSize: 'text-sm' },
    md: { width: 40, height: 40, fontSize: 'text-lg' },
    lg: { width: 64, height: 64, fontSize: 'text-2xl' },
    xl: { width: 96, height: 96, fontSize: 'text-3xl' },
  };
  
  // CMU colors
  const colors = {
    blue: '#0A3D62',
    gold: '#F9CA24',
  };
  
  // Default to shield if invalid variant
  const selectedVariant = ['shield', 'pin', 'simple', 'full'].includes(variant) 
    ? variant 
    : 'shield';

  const { width, height, fontSize } = sizes[size];

  const renderText = () => (
    <div className={`font-bold tracking-tight ${fontSize} text-primary dark:text-foreground`}>
      <span className="text-primary dark:text-foreground">CMU</span>
      <span className="text-primary dark:text-foreground">Finds</span>
    </div>
  );

  // Shield variant with magnifying glass
  if (selectedVariant === 'shield') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <svg width={width} height={height} viewBox="0 0 250 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M125 0L250 60V133.5C250 204.5 196.5 270 125 300C53.5 270 0 204.5 0 133.5V60L125 0Z" fill={colors.blue} />
          <path d="M125 30L225 80V138.5C225 196.5 181.5 250 125 275C68.5 250 25 196.5 25 138.5V80L125 30Z" fill="white" />
          <circle cx="110" cy="140" r="55" fill={colors.gold} />
          <circle cx="110" cy="140" r="40" fill="white" />
          <rect x="150" y="180" width="20" height="80" rx="5" transform="rotate(-45 150 180)" fill={colors.blue} />
        </svg>
        {variant === 'full' && renderText()}
      </div>
    );
  }

  // Pin/location variant
  if (selectedVariant === 'pin') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <svg width={width} height={height} viewBox="0 0 250 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M125 0C56 0 0 56 0 125C0 218.75 125 300 125 300C125 300 250 218.75 250 125C250 56 194 0 125 0Z" fill={colors.blue} />
          <circle cx="125" cy="125" r="55" fill={colors.gold} />
          <circle cx="125" cy="125" r="40" fill="white" />
        </svg>
        {variant === 'full' && renderText()}
      </div>
    );
  }

  // Simple text logo
  if (selectedVariant === 'simple') {
    return (
      <div className={`flex items-center ${className}`}>
        <div className={`font-bold ${fontSize}`}>
          <span className="text-primary dark:text-secondary">CMU</span>
          <span className="text-secondary dark:text-primary">FINDS</span>
        </div>
      </div>
    );
  }

  // Full logo with text
  return (
    <div className={`flex items-center ${className}`}>
      <svg width={width} height={height} viewBox="0 0 250 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M125 0L250 60V133.5C250 204.5 196.5 270 125 300C53.5 270 0 204.5 0 133.5V60L125 0Z" fill={colors.blue} />
        <path d="M125 30L225 80V138.5C225 196.5 181.5 250 125 275C68.5 250 25 196.5 25 138.5V80L125 30Z" fill="white" />
        <circle cx="110" cy="140" r="55" fill={colors.gold} />
        <circle cx="110" cy="140" r="40" fill="white" />
        <rect x="150" y="180" width="20" height="80" rx="5" transform="rotate(-45 150 180)" fill={colors.blue} />
      </svg>
      <div className={`ml-2 font-bold ${fontSize} text-primary dark:text-foreground`}>
        <span>CMUFinds</span>
      </div>
    </div>
  );
};

export default CMUFindsLogo; 