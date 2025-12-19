import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';

interface FileUploadZoneProps {
    onFileSelected: (file: File) => void;
    selectedFile: File | null;
    onClearFile: () => void;
    uploading: boolean;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
    onFileSelected,
    selectedFile,
    onClearFile,
    uploading
}) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onFileSelected(acceptedFiles[0]);
        }
    }, [onFileSelected]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
        multiple: false,
        disabled: uploading
    });

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div>
            {!selectedFile ? (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <input {...getInputProps()} />
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-indigo-600' : 'text-gray-400'
                        }`} />
                    {isDragActive ? (
                        <p className="text-indigo-600 font-medium">Drop the file here...</p>
                    ) : (
                        <>
                            <p className="text-gray-700 font-medium mb-2">
                                Drag & drop your CSV/Excel file here
                            </p>
                            <p className="text-gray-500 text-sm">
                                or click to browse
                            </p>
                            <p className="text-gray-400 text-xs mt-2">
                                Supported: .csv, .xls, .xlsx
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className="border-2 border-indigo-200 bg-indigo-50 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <File className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                <p className="text-sm text-gray-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        {!uploading && (
                            <button
                                onClick={onClearFile}
                                className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Remove file"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploadZone;
