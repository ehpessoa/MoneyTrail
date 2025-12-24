
import React from 'react';
import { Activity } from 'lucide-react';

const BrandSignature: React.FC = () => {
    return (
        <div className="mt-6 pt-6 border-t border-gray-700/50 flex flex-col items-center justify-center gap-2 opacity-90 hover:opacity-100 transition-opacity">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                Desenvolvido por
            </span>
            <div className="flex items-center justify-center select-none scale-90 sm:scale-100">
                <Activity
                    size={26}
                    className="text-[#005BAC] mr-1"
                    strokeWidth={2.5}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(0,91,172,0.2))' }}
                />
                <span
                    className="text-2xl text-gray-400 tracking-tight"
                    style={{ fontFamily: 'sans-serif', fontWeight: 400 }}
                >
                    Sensz
                </span>
                <span
                    className="text-2xl text-white"
                    style={{ fontFamily: 'sans-serif', fontWeight: 700 }}
                >
                    IA
                </span>
            </div>
        </div>
    );
};

export default BrandSignature;
