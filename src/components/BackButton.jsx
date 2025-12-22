import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BackButton({ onClick, className = '' }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }

        // Smart navigation: go back if possible, otherwise home
        if (location.key !== "default") {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors pointer-events-auto ${className}`}
            aria-label="Go back"
        >
            <ArrowLeft size={20} />
        </button>
    );
}
