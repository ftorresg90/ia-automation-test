import React from 'react';
import { X, Sparkles, AlertTriangle } from 'lucide-react';

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    executionId: string;
    errorAnalysis?: string | null;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoUrl, executionId, errorAnalysis }) => {
    if (!isOpen) return null;

    const fullVideoUrl = `http://localhost:3001${videoUrl}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Execution Video</h2>
                        <p className="text-sm text-gray-500 mt-1">ID: {executionId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-600" />
                    </button>
                </div>

                {/* Video Player */}
                <div className="p-6 bg-gray-900 flex justify-center">
                    <video
                        src={fullVideoUrl}
                        controls
                        autoPlay
                        className="max-w-full rounded-lg shadow-xl"
                        style={{ maxHeight: '60vh' }}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                {/* AI Analysis Section */}
                {errorAnalysis && (
                    <div className="p-6 border-t border-gray-200 bg-indigo-50">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-full shadow-sm">
                                <Sparkles className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    AI Failure Analysis
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                        Powered by Gemini
                                    </span>
                                </h3>
                                <div className="prose prose-indigo max-w-none text-gray-700 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm whitespace-pre-wrap font-sans">
                                    {errorAnalysis}
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            Video playback of visual validation execution
                        </p>
                        <button
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoModal;
