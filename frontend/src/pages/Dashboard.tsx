import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../lib/api';
import { Plus, FileText, Play, Trash2, Search, Clock } from 'lucide-react';
import DeleteModal from '../components/DeleteModal';
import ProjectCardSkeleton from '../components/ProjectCardSkeleton';
import Toast from '../components/Toast';

const Dashboard = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'cases' | 'runs'>('name');
    const [filterBy, setFilterBy] = useState<'all' | 'withTests' | 'empty'>('all');

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProjects(res.data);
            } catch (error) {
                console.error('Error fetching projects', error);
                setToast({ message: 'Failed to load projects', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const handleDelete = async (projectId: string, event?: React.MouseEvent) => {
        event?.preventDefault();
        event?.stopPropagation();

        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        setProjectToDelete({ id: projectId, name: project.name });
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;

        try {
            setDeletingId(projectToDelete.id);
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/projects/${projectToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        } catch (error: any) {
            console.error('Error deleting project', error);
            setToast({ message: `Failed to delete project: ${error.response?.data?.error || error.message}`, type: 'error' });
        } finally {
            setDeletingId(null);
            setProjectToDelete(null);
        }
    };

    // Filter and sort logic
    const filteredProjects = projects
        .filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (filterBy === 'withTests') return matchesSearch && (p._count?.testCases || 0) > 0;
            if (filterBy === 'empty') return matchesSearch && (p._count?.testCases || 0) === 0;
            return matchesSearch;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'date':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'cases':
                    return (b._count?.testCases || 0) - (a._count?.testCases || 0);
                case 'runs':
                    return (b._count?.executions || 0) - (a._count?.executions || 0);
                default:
                    return 0;
            }
        });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <Link to="/projects/new" className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-indigo-700 transition-colors">
                    <Plus className="w-5 h-5 mr-2" />
                    New Project
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="name">Sort: Name</option>
                        <option value="date">Sort: Newest</option>
                        <option value="cases">Sort: Test Cases</option>
                        <option value="runs">Sort: Runs</option>
                    </select>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => setFilterBy('all')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterBy === 'all'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterBy('withTests')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterBy === 'withTests'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Has Tests
                    </button>
                    <button
                        onClick={() => setFilterBy('empty')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterBy === 'empty'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Empty
                    </button>
                    {searchTerm && (
                        <span className="text-sm text-gray-500 self-center ml-2">
                            Showing {filteredProjects.length} of {projects.length} projects
                        </span>
                    )}
                </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    // Skeleton loaders while loading
                    <>
                        <ProjectCardSkeleton />
                        <ProjectCardSkeleton />
                        <ProjectCardSkeleton />
                    </>
                ) : filteredProjects.length > 0 ? (
                    filteredProjects.map((project: any, index: number) => {
                        // Calculate status based on last execution
                        const lastExecution = project.executions?.[0];
                        const statusColor = lastExecution?.status === 'RUNNING' ? 'bg-blue-500' :
                            lastExecution?.status === 'PASSED' ? 'bg-green-500' :
                                lastExecution?.status === 'FAILED' ? 'bg-red-500' :
                                    'bg-gray-300';

                        // Calculate time since update
                        const timeSinceUpdate = () => {
                            const updated = new Date(project.updatedAt);
                            const now = new Date();
                            const diffMs = now.getTime() - updated.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMins / 60);
                            const diffDays = Math.floor(diffHours / 24);

                            if (diffDays > 0) return `${diffDays}d ago`;
                            if (diffHours > 0) return `${diffHours}h ago`;
                            if (diffMins > 0) return `${diffMins}m ago`;
                            return 'Just now';
                        };

                        return (
                            <div
                                key={project.id}
                                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col group animate-fadeIn"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <Link to={`/projects/${project.id}`} className="flex-1">
                                        <div className="flex items-start gap-2">
                                            {/* Status indicator dot */}
                                            <div className={`w-2 h-2 rounded-full mt-2 ${statusColor} ${lastExecution?.status === 'RUNNING' ? 'animate-pulse' : ''}`} title={lastExecution?.status || 'No runs'} />
                                            <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-gray-800 mb-1 group-hover:text-indigo-600 transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="text-gray-500 text-sm line-clamp-2">
                                                    {project.description || 'No description'}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={(event) => handleDelete(project.id, event)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        disabled={deletingId === project.id}
                                        title="Delete project"
                                    >
                                        <Trash2 className={`w-4 h-4 ${deletingId === project.id ? 'animate-pulse' : ''}`} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-500 border-t pt-4 mt-auto">
                                    <div className="flex items-center gap-1">
                                        <FileText className="w-4 h-4" />
                                        <span>{project._count?.testCases || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Play className="w-4 h-4" />
                                        <span>{project._count?.executions || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1 ml-auto text-xs text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        <span>{timeSinceUpdate()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : projects.length > 0 ? (
                    // No results after filtering
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 mb-4">No projects match your filters</p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterBy('all');
                            }}
                            className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    // No projects at all
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500 mb-4">No projects found. Create your first project!</p>
                        <Link to="/projects/new" className="btn-primary inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            New Project
                        </Link>
                    </div>
                )}
            </div>

            <DeleteModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setProjectToDelete(null);
                }}
                onConfirm={async () => {
                    await confirmDelete();
                    setDeleteModalOpen(false);
                }}
                itemName={projectToDelete?.name || ''}
                itemType="project"
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
