'use client';

import * as React from 'react';

const BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium tracking-tight transition-[transform,background-color,border-color,color] duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] select-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

const VARIANTS = {
  default: 'bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/95',
  destructive: 'bg-destructive/15 border border-destructive/30 text-destructive-foreground hover:bg-destructive/25',
  outline: 'border border-white/[0.09] bg-background/50 hover:bg-white/[0.05] hover:border-white/[0.15] hover:text-foreground',
  secondary: 'bg-secondary/80 border border-white/[0.06] text-secondary-foreground hover:bg-secondary hover:text-foreground',
  ghost: 'hover:bg-white/[0.06] hover:text-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
} as const;

const SIZES = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-10 px-6 text-sm',
  icon: 'h-8 w-8',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    const cls = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();
    if (asChild && React.isValidElement<{ className?: string }>(children)) {
      return React.cloneElement(children, {
        ...(props as Record<string, unknown>),
        className: `${cls} ${children.props.className ?? ''}`.trim(),
      });
    }
    return (
      <button ref={ref} className={cls} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
