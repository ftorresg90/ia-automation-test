import React from 'react';
import { X, CheckCircle, FileText, Terminal } from 'lucide-react';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileName: string;
    buildTool: 'maven' | 'gradle';
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, fileName, buildTool }) => {
    if (!isOpen) return null;

    const instructions = buildTool === 'maven'
        ? [
            'Unzip the downloaded file',
            'Navigate to the project directory',
            'Run: mvn clean test',
            'View reports in target/cucumber-reports/'
        ]
        : [
            'Unzip the downloaded file',
            'Navigate to the project directory',
            'Run: gradle clean test',
            'View reports in build/reports/'
        ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full transform transition-all">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-full">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Framework Generated!</h2>
                    </div>
                    <p className="text-sm text-gray-600 ml-11">
                        Your Selenium + Cucumber framework is ready
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* File Info */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-indigo-900">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">{fileName}</span>
                        </div>
                    </div>

                    {/* Quick Start Instructions */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Terminal className="w-4 h-4" />
                            Quick Start:
                        </h3>
                        <ol className="space-y-2">
                            {instructions.map((instruction, index) => (
                                <li key={index} className="flex gap-3 text-sm text-gray-600">
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-medium">
                                        {index + 1}
                                    </span>
                                    <span className="flex-1">{instruction}</span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    {/* Command Snippet */}
                    <div className="bg-gray-900 rounded-lg p-3 text-white font-mono text-sm">
                        <span className="text-gray-400">$</span> {buildTool === 'maven' ? 'mvn clean test' : 'gradle clean test'}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;
