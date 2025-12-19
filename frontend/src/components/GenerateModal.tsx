import React, { useState } from 'react';
import { X, Package, FileArchive } from 'lucide-react';

interface GenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (buildTool: 'maven' | 'gradle') => void;
    projectName: string;
    testCasesCount: number;
    featuresCount: number;
}

const GenerateModal: React.FC<GenerateModalProps> = ({
    isOpen,
    onClose,
    onGenerate,
    projectName,
    testCasesCount,
    featuresCount
}) => {
    const [selectedTool, setSelectedTool] = useState<'maven' | 'gradle'>('maven');

    if (!isOpen) return null;

    const handleGenerate = () => {
        onGenerate(selectedTool);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Package className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Generate Framework</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">What will be generated:</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>Features:</span>
                                <span className="font-medium text-gray-900">{featuresCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Test Cases:</span>
                                <span className="font-medium text-gray-900">{testCasesCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Archive:</span>
                                <span className="font-medium text-gray-900 flex items-center gap-1">
                                    <FileArchive className="w-3 h-3" />
                                    framework-{projectName}.zip
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Build Tool Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Select Build Tool:
                        </label>
                        <div className="space-y-3">
                            {/* Maven Option */}
                            <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedTool === 'maven'
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                <input
                                    type="radio"
                                    name="buildTool"
                                    value="maven"
                                    checked={selectedTool === 'maven'}
                                    onChange={() => setSelectedTool('maven')}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Maven</div>
                                    <div className="text-xs text-gray-500">pom.xml + mvn test</div>
                                </div>
                                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                                    Recommended
                                </span>
                            </label>

                            {/* Gradle Option - Now Available! */}
                            <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedTool === 'gradle'
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}>
                                <input
                                    type="radio"
                                    name="buildTool"
                                    value="gradle"
                                    checked={selectedTool === 'gradle'}
                                    onChange={() => setSelectedTool('gradle')}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Gradle</div>
                                    <div className="text-xs text-gray-500">build.gradle + gradle test</div>
                                </div>
                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    Available
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                    >
                        Generate {selectedTool === 'maven' ? 'Maven' : 'Gradle'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenerateModal;
