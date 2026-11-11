'use client';

import * as React from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-4xl',
  className = '',
}: DialogProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-3 backdrop-blur-sm animate-scrim-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative flex max-h-[90vh] sm:max-h-[92vh] w-full ${maxWidth} flex-col rounded-t-2xl sm:rounded-lg border-t sm:border border-white/10 bg-card/95 shadow-2xl backdrop-blur-xl animate-modal-in ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Mobile Sheet Pill Grab Handle */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1 shrink-0" aria-hidden="true">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  title,
  description,
  icon,
  onClose,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function DialogBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`flex-1 overflow-y-auto ${className}`}>{children}</div>;
}

export function DialogFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-center justify-between border-t border-border bg-card px-5 py-3 text-xs ${className}`}>
      {children}
    </div>
  );
}
