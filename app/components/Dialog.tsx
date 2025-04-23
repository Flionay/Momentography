'use client';

import { Dialog as HeadlessDialog } from '@headlessui/react';
import { Fragment, ReactNode } from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

interface DialogPanelProps {
  children: ReactNode;
  className?: string;
}

// 导出主要Dialog组件
function Dialog({ isOpen, onClose, children }: DialogProps) {
  return (
    <HeadlessDialog
      as="div"
      className="relative z-50"
      open={isOpen}
      onClose={onClose}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      {children}
    </HeadlessDialog>
  );
}

// 导出Dialog子组件
Dialog.Panel = function DialogPanel({ children, className = '' }: DialogPanelProps) {
  return (
    <HeadlessDialog.Panel className={`mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {children}
    </HeadlessDialog.Panel>
  );
};

export default Dialog; 