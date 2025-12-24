
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  label?: string;
  as?: 'input' | 'select' | 'textarea';
}

const Input: React.FC<InputProps> = ({ label, id, as = 'input', className = '', ...props }) => {
  const baseStyles = 'w-full px-4 py-2 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors';
  
  const Component = as;

  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-300">{label}</label>}
      <Component id={id} className={`${baseStyles} ${className}`} {...props} />
    </div>
  );
};

export default Input;
