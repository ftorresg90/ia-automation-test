import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 4000, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const config = {
        success: {
            icon: CheckCircle,
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-800',
            iconColor: 'text-green-500'
        },
        error: {
            icon: XCircle,
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-800',
            iconColor: 'text-red-500'
        },
        warning: {
            icon: AlertTriangle,
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-800',
            iconColor: 'text-yellow-500'
        },
        info: {
            icon: Info,
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-800',
            iconColor: 'text-blue-500'
        }
    };

    const { icon: Icon, bg, border, text, iconColor } = config[type];

    return (
        <div
            className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
        >
            <div className={`flex items-center gap-3 ${bg} ${border} border ${text} px-4 py-3 rounded-lg shadow-lg max-w-md`}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
                <p className="text-sm font-medium flex-1">{message}</p>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className={`${text} hover:opacity-70 transition-opacity`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Toast;
