import React, { useState } from 'react';
import { Play, Video, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface Execution {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
    createdAt: string;
    videoUrl?: string;
    screenshotUrl?: string;
    logs?: string;
    errorAnalysis?: string | null;
}

interface TestCaseExecutionRowProps {
    latestExecution: Execution | null;
    onRetry: (executionId: string) => void;
    onViewVideo: (execution: Execution) => void;
}

export const TestCaseExecutionRow: React.FC<TestCaseExecutionRowProps> = ({
    latestExecution,
    onRetry,
    onViewVideo
}) => {
    const [logsExpanded, setLogsExpanded] = useState(false);

    if (!latestExecution) {
        return (
            <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Not run yet
            </div>
        );
    }

    const { status, createdAt, videoUrl, screenshotUrl, logs, errorAnalysis } = latestExecution;

    return (
        <div className="space-y-2">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-xs text-gray-500">
                    {new Date(createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </span>
            </div>

            {/* Action Buttons */}
            {status !== 'RUNNING' && (
                <div className="flex gap-2">
                    {(videoUrl || screenshotUrl) && (
                        <button
                            onClick={() => onViewVideo(latestExecution)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors"
                        >
                            <Video className="w-3 h-3" />
                            {videoUrl ? 'Watch' : 'Screenshot'}
                        </button>
                    )}
                    <button
                        onClick={() => onRetry(latestExecution.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <Play className="w-3 h-3" />
                        Re-run
                    </button>
                </div>
            )}

            {/* Running Progress */}
            {status === 'RUNNING' && (
                <div className="mt-2">
                    <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full animate-pulse w-3/4" />
                    </div>
                    <p className="text-xs text-indigo-600 mt-1 animate-pulse">Running test...</p>
                </div>
            )}

            {/* Logs (Expandable) */}
            {logs && status !== 'RUNNING' && (
                <div className="mt-2">
                    <button
                        onClick={() => setLogsExpanded(!logsExpanded)}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                        {logsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {logsExpanded ? 'Hide' : 'Show'} Logs
                    </button>
                    {logsExpanded && (
                        <div className="mt-2 bg-gray-900 rounded p-3 max-h-40 overflow-auto">
                            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{logs}</pre>
                        </div>
                    )}
                </div>
            )}

            {/* Error Analysis & Suggestion */}
            {status === 'FAILED' && errorAnalysis && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-amber-900 whitespace-pre-wrap">{errorAnalysis}</p>
                            {errorAnalysis.includes('AUTO-HEAL') && (
                                <p className="mt-2 text-amber-700 font-medium">
                                    💡 Suggestion: Re-run this test to verify the fix
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {status === 'PASSED' && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    All steps completed successfully
                </p>
            )}
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'PASSED':
            return (
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100 inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    PASSED
                </span>
            );
        case 'FAILED':
            return (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100 inline-flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    FAILED
                </span>
            );
        case 'RUNNING':
            return (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 inline-flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    RUNNING
                </span>
            );
        default:
            return (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    PENDING
                </span>
            );
    }
};
