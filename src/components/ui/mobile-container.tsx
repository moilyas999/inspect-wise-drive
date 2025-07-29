import React from 'react';
import { cn } from '@/lib/utils';

interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
  withSafeArea?: boolean;
  withPadding?: boolean;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({
  children,
  className,
  withSafeArea = true,
  withPadding = true
}) => {
  return (
    <div 
      className={cn(
        'min-h-screen w-full bg-background',
        withSafeArea && 'pb-safe-area-inset-bottom pt-safe-area-inset-top',
        withPadding && 'px-4',
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileScreen: React.FC<MobileContainerProps> = ({
  children,
  className,
  withSafeArea = true,
  withPadding = true
}) => {
  return (
    <div 
      className={cn(
        'min-h-screen w-full bg-gradient-to-b from-background to-muted/20 overflow-x-hidden',
        withSafeArea && 'pb-safe-area-inset-bottom pt-safe-area-inset-top',
        className
      )}
    >
      <div className={cn('w-full', withPadding && 'px-4 py-2')}>
        {children}
      </div>
    </div>
  );
};