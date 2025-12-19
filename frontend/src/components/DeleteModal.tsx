import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
    itemType?: string;
    title?: string;
    message?: string;
    confirmText?: string;
    confirmColor?: 'red' | 'yellow' | 'blue';
}

const DeleteModal: React.FC<DeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    itemType = 'item',
    title,
    message,
    confirmText = 'Delete',
    confirmColor = 'red'
}) => {
    if (!isOpen) return null;

    const defaultTitle = title || `Delete ${itemType}`;
    const defaultMessage = message || (
        itemName
            ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
            : `Are you sure you want to proceed? This action cannot be undone.`
    );

    const colorClasses = {
        red: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700'
        },
        yellow: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-600',
            button: 'bg-yellow-600 hover:bg-yellow-700'
        },
        blue: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700'
        }
    };

    const colors = colorClasses[confirmColor];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-fadeIn">
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                            <AlertTriangle className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">{defaultTitle}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-600">{defaultMessage}</p>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${colors.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal;
