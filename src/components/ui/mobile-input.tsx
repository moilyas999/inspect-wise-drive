import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Label } from './label';

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, leftIcon, rightIcon, className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <Label 
            htmlFor={props.id} 
            className="text-sm font-medium text-foreground"
          >
            {label}
          </Label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <Input
            ref={ref}
            className={cn(
              'h-14 text-base rounded-2xl border-2 transition-all duration-200',
              'focus:border-primary/50 focus:ring-4 focus:ring-primary/10',
              'bg-card/50 backdrop-blur-sm',
              leftIcon && 'pl-12',
              rightIcon && 'pr-12',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/10',
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-destructive px-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';