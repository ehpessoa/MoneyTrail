
import React, { Fragment } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-end sm:items-center"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] flex flex-col m-0 sm:m-4 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </header>
        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
        @media (min-width: 640px) {
            @keyframes slide-up {
              from { transform: translateY(50px) scale(0.95); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
        }
      `}</style>
    </div>
  );
};

export default Modal;
