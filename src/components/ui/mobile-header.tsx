import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  className,
  transparent = false
}) => {
  return (
    <header 
      className={cn(
        'sticky top-0 z-50 w-full border-b backdrop-blur-xl',
        transparent ? 'bg-background/80' : 'bg-background/95',
        'border-border/50',
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-10 w-10 rounded-full shrink-0 hover:bg-accent/50 active:scale-95 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate -mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {rightAction && (
          <div className="shrink-0 ml-2">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
};