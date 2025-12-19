import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../lib/api';
import { Upload, Download, Play, Loader2, Video, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import Toast from '../components/Toast';
import FileUploadZone from '../components/FileUploadZone';
import GenerateModal from '../components/GenerateModal';
import SuccessModal from '../components/SuccessModal';
import VideoModal from '../components/VideoModal';
import DeleteModal from '../components/DeleteModal';
import { TestCaseExecutionRow } from '../components/TestCaseExecutionRow';

const ProjectDetails = () => {
    const { id } = useParams();
    const [project, setProject] = useState<any>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const selectAllRef = useRef<HTMLInputElement | null>(null);

    // Modal and toast state
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [buildTool, setBuildTool] = useState<'maven' | 'gradle'>('maven');
    const [lastGeneratedFile, setLastGeneratedFile] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

    // Upload and execution state
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [selectedCases, setSelectedCases] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectionMode, setSelectionMode] = useState<'all' | 'custom'>('all');

    // Video modal state
    const [videoModal, setVideoModal] = useState<{ isOpen: boolean; videoUrl: string; executionId: string; errorAnalysis?: string | null }>({
        isOpen: false,
        videoUrl: '',
        executionId: '',
        errorAnalysis: null
    });

    // Confirmation modals
    const [clearExecutionsModalOpen, setClearExecutionsModalOpen] = useState(false);
    const [deleteTestCaseModalOpen, setDeleteTestCaseModalOpen] = useState(false);
    const [deleteAllTestCasesModalOpen, setDeleteAllTestCasesModalOpen] = useState(false);
    const [testCaseToDelete, setTestCaseToDelete] = useState<string | null>(null);

    const fetchProject = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/projects/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProject(res.data);
        } catch (error) {
            console.error('Error fetching project', error);
            setToast({ message: 'Error loading project details', type: 'error' });
        }
    }, [id]);

    useEffect(() => {
        fetchProject();
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [id]);

    useEffect(() => {
        // Check if any test case has a running execution
        const hasRunningExecution = project?.testCases?.some((tc: any) =>
            tc.latestExecution?.status === 'RUNNING'
        );

        if (hasRunningExecution) {
            if (!pollingRef.current) {
                pollingRef.current = setInterval(() => {
                    fetchProject();
                }, 5000);
            }
        } else if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, [project?.testCases, fetchProject]);

    useEffect(() => {
        if (!project?.testCases) return;
        const availableIds = project.testCases.map((tc: any) => tc.id);
        setSelectedCases(prev => {
            if (selectionMode === 'all') {
                return availableIds;
            }
            const filtered = prev.filter(id => availableIds.includes(id));
            return filtered;
        });
    }, [project?.testCases, selectionMode]);

    useEffect(() => {
        if (!selectAllRef.current) return;
        const total = project?.testCases?.length || 0;
        selectAllRef.current.indeterminate = selectedCases.length > 0 && selectedCases.length < total;
    }, [selectedCases, project?.testCases]);

    const handleFileUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('projectId', id!);

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            await fetchProject();
            setToast({ message: `File uploaded successfully! ${selectedFile.name}`, type: 'success' });
            setSelectedFile(null);
        } catch (error: any) {
            console.error('Upload error:', error);
            setToast({ message: 'Error uploading file: ' + (error.response?.data?.error || error.message), type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleOpenGenerateModal = () => {
        setShowGenerateModal(true);
    };

    const handleGenerate = async (selectedBuildTool: 'maven' | 'gradle') => {
        setBuildTool(selectedBuildTool);
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/generate/${id}?buildTool=${selectedBuildTool}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = `framework-${project?.name || 'project'}.zip`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setLastGeneratedFile(fileName);
            setShowSuccessModal(true);
            setToast({ message: 'Framework downloaded successfully!', type: 'success' });
        } catch (error: any) {
            console.error('Generation error:', error);
            setToast({
                message: 'Error generating framework: ' + (error.response?.data?.error || error.message),
                type: 'error'
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleExecute = async () => {
        if (!project?.testCases || project.testCases.length === 0) {
            setToast({ message: 'There are no test cases to execute.', type: 'warning' });
            return;
        }
        if (selectedCases.length === 0) {
            setToast({ message: 'Please select at least one test case to execute.', type: 'warning' });
            return;
        }

        setExecuting(true);
        try {
            const token = localStorage.getItem('token');
            const payload: Record<string, any> = { projectId: id };
            if (selectedCases.length !== project.testCases.length) {
                payload.testCaseIds = selectedCases;
            }
            const res = await axios.post(`${API_URL}/execution`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setToast({ message: `Visual validation started! Execution ID: ${res.data.executionId}`, type: 'success' });

            // Wait a bit and refresh once
            setTimeout(async () => {
                try {
                    await fetchProject();
                } catch (err) {
                    console.error('Error refreshing project:', err);
                }
            }, 1000);

        } catch (error: any) {
            console.error('Execution error:', error);
            const errorMsg = error.response?.data?.error || error.message;
            setToast({ message: `Error starting execution: ${errorMsg}`, type: 'error' });
        } finally {
            setExecuting(false);
        }
    };

    const handleStopExecution = async (executionId: string) => {
        if (!confirm('Are you sure you want to stop this execution?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/execution/stop/${executionId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ message: 'Execution stopped successfully', type: 'success' });
            await fetchProject();
        } catch (error: any) {
            console.error('Stop error:', error);
            setToast({ message: `Error stopping execution: ${error.response?.data?.error || error.message}`, type: 'error' });
        }
    };

    const handleClearExecutions = async () => {
        setClearExecutionsModalOpen(true);
    };

    const confirmClearExecutions = async () => {
        if (!project?.id) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/execution/project/${project.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchProject();
            setToast({ message: 'Executions cleared successfully', type: 'success' });
        } catch (error: any) {
            console.error('Clear executions error:', error);
            setToast({ message: `Error clearing executions: ${error.response?.data?.error || error.message}`, type: 'error' });
        }
    };

    const handleRetryExecution = async (executionId: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/execution/retry/${executionId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ message: 'Retry started successfully', type: 'success' });
            await fetchProject();
        } catch (error: any) {
            console.error('Retry error:', error);
            setToast({ message: `Error retrying execution: ${error.response?.data?.error || error.message}`, type: 'error' });
        }
    };

    const handleToggleAllCases = () => {
        if (!project?.testCases || project.testCases.length === 0) return;
        const allSelected = selectedCases.length === project.testCases.length && project.testCases.length > 0;
        if (allSelected) {
            setSelectionMode('custom');
            setSelectedCases([]);
        } else {
            setSelectionMode('all');
            setSelectedCases(project.testCases.map((tc: any) => tc.id));
        }
    };

    const handleDeleteTestCase = async (testCaseId: string) => {
        setTestCaseToDelete(testCaseId);
        setDeleteTestCaseModalOpen(true);
    };

    const confirmDeleteTestCase = async () => {
        if (!testCaseToDelete) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/testcases/${testCaseToDelete}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedCases(prev => prev.filter(id => id !== testCaseToDelete));
            await fetchProject();
            setToast({ message: 'Test case deleted successfully', type: 'success' });
        } catch (error: any) {
            console.error('Delete test case error:', error);
            setToast({ message: `Error deleting test case: ${error.response?.data?.error || error.message}`, type: 'error' });
        } finally {
            setTestCaseToDelete(null);
        }
    };

    const handleDeleteAllTestCases = () => {
        setDeleteAllTestCasesModalOpen(true);
    };

    const confirmDeleteAllTestCases = async () => {
        if (!project?.testCases || project.testCases.length === 0) return;

        try {
            const token = localStorage.getItem('token');
            const deletePromises = project.testCases.map((tc: any) =>
                axios.delete(`${API_URL}/testcases/${tc.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            );

            await Promise.all(deletePromises);
            setSelectedCases([]);
            await fetchProject();
            setToast({ message: `${project.testCases.length} test cases deleted successfully`, type: 'success' });
        } catch (error: any) {
            console.error('Delete all test cases error:', error);
            setToast({ message: `Error deleting test cases: ${error.response?.data?.error || error.message}`, type: 'error' });
        }
    };

    const handleToggleCase = (caseId: string) => {
        setSelectionMode('custom');
        setSelectedCases(prev =>
            prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
        );
    };

    if (!project) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-600">Loading project...</span>
            </div>
        );
    }

    const totalCases = project.testCases?.length || 0;
    const selectedCount = selectedCases.length;
    const selectionSummary = totalCases === 0
        ? 'No test cases available'
        : selectedCount === 0
            ? 'No test cases selected'
            : selectedCount === totalCases
                ? 'All test cases selected'
                : `${selectedCount} selected of ${totalCases}`;
    const hasCases = totalCases > 0;
    const allCasesSelected = hasCases && selectedCount === totalCases;
    const canRunSelection = hasCases && selectedCount > 0;

    return (
        <div className="space-y-6">
            <div className="card p-6 sticky top-0 z-10 bg-white shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
                        <p className="text-gray-600 break-words">{project.description || 'No description provided'}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleOpenGenerateModal}
                            disabled={generating}
                            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {generating ? 'Generating...' : 'Download Framework'}
                        </button>

                        <button
                            onClick={handleExecute}
                            disabled={executing || !canRunSelection}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {executing ? 'Running...' : `Run Visual Validation${canRunSelection && selectedCount !== totalCases ? ` (${selectedCount})` : ''}`}
                        </button>
                        {!canRunSelection && (
                            <p className="text-xs text-red-500 text-center lg:text-right w-full">
                                Select at least one test case
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* File Upload Section */}
            <div className="card p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Test Cases</h2>
                <FileUploadZone
                    onFileSelected={(file) => setSelectedFile(file)}
                    selectedFile={selectedFile}
                    onClearFile={() => setSelectedFile(null)}
                    uploading={uploading}
                />
                {selectedFile && (
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleFileUpload}
                            disabled={uploading}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Upload File
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Test Cases Section - Full Width */}
            <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Test Cases ({project.testCases?.length || 0})
                    </h2>
                    {project.testCases && project.testCases.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <span>{selectionSummary}</span>
                            <button
                                onClick={handleToggleAllCases}
                                className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-700"
                            >
                                {allCasesSelected
                                    ? 'Clear Selection'
                                    : 'Select All'}
                            </button>
                            <button
                                onClick={handleDeleteAllTestCases}
                                className="px-3 py-1 rounded-lg text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete All
                            </button>
                        </div>
                    )}
                </div>

                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                        <input
                                            type="checkbox"
                                            ref={selectAllRef}
                                            checked={allCasesSelected}
                                            onChange={handleToggleAllCases}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            disabled={!hasCases}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Feature
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Steps
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {project.testCases && project.testCases.length > 0 ? (
                                    project.testCases.map((tc: any) => (
                                        <tr key={tc.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCases.includes(tc.id)}
                                                    onChange={() => handleToggleCase(tc.id)}
                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                                <div className="font-medium break-words">{tc.title}</div>
                                                {tc.description && (
                                                    <div className="text-gray-500 text-xs mt-1 break-words line-clamp-2">
                                                        {tc.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                                    {tc.feature || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {Array.isArray(tc.steps) ? tc.steps.length : 0} steps
                                            </td>
                                            <td className="px-6 py-4">
                                                <TestCaseExecutionRow
                                                    latestExecution={tc.latestExecution}
                                                    onRetry={handleRetryExecution}
                                                    onViewVideo={(exec) => {
                                                        if (exec.videoUrl) {
                                                            setVideoModal({
                                                                isOpen: true,
                                                                videoUrl: exec.videoUrl,
                                                                executionId: exec.id,
                                                                errorAnalysis: exec.errorAnalysis
                                                            });
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteTestCase(tc.id)}
                                                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            <div className="text-center">
                                                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                <p className="text-base">No test cases yet</p>
                                                <p className="text-sm mt-1">Upload a CSV/Excel file to get started</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <VideoModal
                isOpen={videoModal.isOpen}
                onClose={() => setVideoModal({ isOpen: false, videoUrl: '', executionId: '', errorAnalysis: null })}
                videoUrl={videoModal.videoUrl}
                executionId={videoModal.executionId}
                errorAnalysis={videoModal.errorAnalysis}
            />

            <GenerateModal
                isOpen={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                onGenerate={handleGenerate}
                projectName={project?.name || 'project'}
                testCasesCount={project?.testCases?.length || 0}
                featuresCount={new Set(project?.testCases?.map((tc: any) => tc.feature)).size || 0}
            />

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                fileName={lastGeneratedFile}
                buildTool={buildTool}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Clear Executions Confirmation Modal */}
            <DeleteModal
                isOpen={clearExecutionsModalOpen}
                onClose={() => setClearExecutionsModalOpen(false)}
                onConfirm={confirmClearExecutions}
                title="Clear All Executions"
                message="This will remove all stored executions for this project. Continue?"
                confirmText="Clear"
                confirmColor="yellow"
            />

            {/* Delete Test Case Confirmation Modal */}
            <DeleteModal
                isOpen={deleteTestCaseModalOpen}
                onClose={() => {
                    setDeleteTestCaseModalOpen(false);
                    setTestCaseToDelete(null);
                }}
                onConfirm={confirmDeleteTestCase}
                title="Delete Test Case"
                message="Are you sure you want to delete this test case? This action cannot be undone."
                confirmText="Delete"
                confirmColor="red"
            />

            {/* Delete All Test Cases Confirmation Modal */}
            <DeleteModal
                isOpen={deleteAllTestCasesModalOpen}
                onClose={() => setDeleteAllTestCasesModalOpen(false)}
                onConfirm={confirmDeleteAllTestCases}
                title="Delete All Test Cases"
                message={`Are you sure you want to delete all ${project?.testCases?.length || 0} test cases? This action cannot be undone.`}
                confirmText="Delete All"
                confirmColor="red"
            />
        </div>
    );
};

export default ProjectDetails;
