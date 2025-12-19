import React from 'react';

const ProjectCardSkeleton: React.FC = () => {
    return (
        <div className="card p-6 animate-pulse">
            {/* Header with title skeleton */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mt-1"></div>
                </div>
                <div className="ml-4">
                    <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                </div>
            </div>

            {/* Stats skeleton */}
            <div className="flex gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
            </div>

            {/* Footer skeleton */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
        </div>
    );
};

export default ProjectCardSkeleton;
