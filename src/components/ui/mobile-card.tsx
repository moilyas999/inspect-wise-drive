import React from 'react';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'flat' | 'bordered';
  interactive?: boolean;
  onClick?: () => void;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className,
  variant = 'default',
  interactive = false,
  onClick
}) => {
  const baseClasses = 'rounded-3xl transition-all duration-200';
  
  const variantClasses = {
    default: 'bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm',
    elevated: 'bg-card shadow-lg border-0',
    flat: 'bg-muted/30 border-0',
    bordered: 'bg-card border-2 border-border'
  };
  
  const interactiveClasses = interactive 
    ? 'active:scale-[0.98] hover:shadow-md cursor-pointer'
    : '';

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        interactiveClasses,
        className
      )}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export const MobileCardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('p-6 pb-3', className)}>
    {children}
  </div>
);

export const MobileCardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('px-6 pb-6', className)}>
    {children}
  </div>
);

export const MobileCardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h3 className={cn('text-lg font-semibold text-foreground leading-tight', className)}>
    {children}
  </h3>
);

export const MobileCardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p className={cn('text-sm text-muted-foreground mt-1', className)}>
    {children}
  </p>
);