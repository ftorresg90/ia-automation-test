import React, { useState } from 'react';
import { Play, Loader2, Video, XCircle, Clock, CheckCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface Execution {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
    createdAt: string;
    videoUrl?: string;
    logs?: string;
    errorAnalysis?: string | null;
}

interface ExecutionListProps {
    executions: Execution[];
    onStop: (id: string) => void;
    onRetry: (id: string) => void;
    onViewVideo: (execution: Execution) => void;
    onClear: () => void;
}

const ExecutionList: React.FC<ExecutionListProps> = ({ executions, onStop, onRetry, onViewVideo, onClear }) => {
    const [expandedLogs, setExpandedLogs] = useState<string | null>(null);

    const toggleLogs = (id: string) => {
        setExpandedLogs(expandedLogs === id ? null : id);
    };

    if (!executions || executions.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                <Play className="mx-auto h-12 w-12 text-indigo-200 mb-3" />
                <p className="text-gray-500 text-base font-medium">No executions yet</p>
                <p className="text-gray-400 text-sm mt-1">Click "Run Visual Validation" to start testing</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-1">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    Recent Executions
                    <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                        {executions.length}
                    </span>
                </h2>
                <button
                    onClick={onClear}
                    className="mt-2 sm:mt-0 text-sm text-red-600 hover:text-red-700 font-medium hover:underline disabled:opacity-50"
                    disabled={executions.length === 0}
                >
                    Clear History
                </button>
            </div>

            <div className="space-y-4">
                {executions.map((exec) => (
                    <div key={exec.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        {/* Header Section */}
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <StatusBadge status={exec.status} />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Execution ID</span>
                                        <span className="text-sm font-mono text-gray-600 break-all">{exec.id.split('-').pop()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                        <Clock className="w-3 h-3" />
                                        {new Date(exec.createdAt).toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Status Message */}
                            <div className="mb-5">
                                <p className="text-sm text-gray-700 font-medium">
                                    {getStatusMessage(exec.status)}
                                </p>
                            </div>

                            {/* Progress Bar (Running) */}
                            {exec.status === 'RUNNING' && (
                                <div className="mb-5">
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full animate-pulse w-3/4" />
                                    </div>
                                    <p className="text-xs text-indigo-600 mt-2 font-medium animate-pulse">Running automation...</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                {exec.status === 'RUNNING' ? (
                                    <button
                                        onClick={() => onStop(exec.id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-sm font-semibold"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Stop Execution
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onViewVideo(exec)}
                                            disabled={!exec.videoUrl}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold ${exec.videoUrl
                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            <Video className="w-4 h-4" />
                                            {exec.videoUrl ? 'Watch Video' : 'Processing Video...'}
                                        </button>

                                        <button
                                            onClick={() => onRetry(exec.id)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors text-sm font-medium border border-gray-200"
                                            title="Retry"
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Logs Accordion */}
                        {exec.logs && (
                            <div className="border-t border-gray-50">
                                <button
                                    onClick={() => toggleLogs(exec.id)}
                                    className="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-medium">Execution Logs</span>
                                    {expandedLogs === exec.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {expandedLogs === exec.id && (
                                    <div className="px-5 pb-5 bg-gray-900 border-t border-gray-800">
                                        <pre className="text-xs text-gray-300 font-mono overflow-x-auto p-4 whitespace-pre-wrap max-h-60 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                                            {exec.logs}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'PASSED':
            return (
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100 inline-flex items-center gap-1.5 shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" />
                    PASSED
                </span>
            );
        case 'FAILED':
            return (
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100 inline-flex items-center gap-1.5 shadow-sm">
                    <XCircle className="w-3.5 h-3.5" />
                    FAILED
                </span>
            );
        case 'RUNNING':
            return (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 inline-flex items-center gap-1.5 shadow-sm animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    RUNNING
                </span>
            );
        default:
            return (
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200 inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    PENDING
                </span>
            );
    }
};

const getStatusMessage = (status: string) => {
    switch (status) {
        case 'RUNNING': return 'Execution is currently in progress...';
        case 'PASSED': return 'Success! All visual validations passed.';
        case 'FAILED': return 'Issues detected during validation steps.';
        default: return 'Waiting for execution to start...';
    }
};

export default ExecutionList;
