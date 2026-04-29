import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-orange-500 hover:bg-orange-600 text-white',
    info: 'bg-brand hover:bg-brand-hover text-white'
  };

  const iconStyles = {
    danger: 'text-red-600 bg-red-50',
    warning: 'text-orange-500 bg-orange-50',
    info: 'text-brand bg-brand/10'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${iconStyles[variant]}`}>
              <AlertTriangle size={24} />
            </div>
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-surface-hover rounded-full transition-colors"
            >
              <X size={20} className="text-muted" />
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-primary mb-2">{title}</h3>
          <p className="text-secondary text-sm leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="bg-surface-hover p-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-secondary hover:text-secondary transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={async () => {
              await onConfirm();
              onCancel();
            }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-subtle active:scale-95 ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
