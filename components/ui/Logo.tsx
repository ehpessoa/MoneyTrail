
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-3 text-white">
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-cyan-400"
      >
        <path
          d="M12 2V22"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="0.2 0.3"
          className="opacity-50"
        />
        <path
          d="M17 5H9.5C7.57 5 6 6.57 6 8.5C6 10.43 7.57 12 9.5 12H14.5C16.43 12 18 13.57 18 15.5C18 17.43 16.43 19 14.5 19H7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-4xl font-bold tracking-tighter">
        Money<span className="text-cyan-400">Trail</span>
      </span>
    </div>
  );
};

export default Logo;
