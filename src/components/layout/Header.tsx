import { Share, Download, ChevronDown, Plus, Trash2, FolderOpen, Maximize2, Minimize2, FileText, FileJson, FileType, Loader2 } from 'lucide-react';
import { useProjectStore, useEditorStore } from '../../stores/projectStore';
import { useState, useRef, useEffect } from 'react';

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

interface HeaderProps {
    onNewProject: () => void;
}

export function Header({ onNewProject }: HeaderProps) {
    const { currentProject, projects, setCurrentProject, removeProject, setChapters } = useProjectStore();
    const { setCurrentChapter, isFocusMode, setFocusMode } = useEditorStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const exportRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
                setIsExportOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectProject = async (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setCurrentChapter(null);
            setCurrentProject(project);
            setIsDropdownOpen(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!currentProject) return;

        setIsDeleting(true);
        try {
            await window.electronAPI.deleteProject(currentProject.id);
            removeProject(currentProject.id);
            setCurrentChapter(null);
            setChapters([]);

            // Select another project if available
            const remainingProjects = projects.filter(p => p.id !== currentProject.id);
            if (remainingProjects.length > 0) {
                setCurrentProject(remainingProjects[0]);
            } else {
                setCurrentProject(null);
            }

            setShowDeleteConfirm(false);
        } catch (err) {
            console.error('Failed to delete project:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportToWord = async () => {
        if (!currentProject) return;

        setExportStatus('exporting');
        setIsExportOpen(false);

        try {
            // Show save dialog
            const result = await window.electronAPI.showSaveDialog({
                title: 'Export as Word Document',
                defaultPath: `${currentProject.title}.docx`,
                filters: [
                    { name: 'Word Document', extensions: ['docx'] },
                ],
            });

            if (result.canceled || !result.filePath) {
                setExportStatus('idle');
                return;
            }

            // Export all chapters
            const exportResult = await window.electronAPI.exportToDocx(
                currentProject.id,
                [], // Empty = all chapters
                result.filePath
            );

            if (exportResult.success) {
                setExportStatus('success');
                setTimeout(() => setExportStatus('idle'), 3000);
            } else {
                console.error('Export failed:', exportResult.error);
                setExportStatus('error');
                setTimeout(() => setExportStatus('idle'), 3000);
            }
        } catch (err) {
            console.error('Export error:', err);
            setExportStatus('error');
            setTimeout(() => setExportStatus('idle'), 3000);
        }
    };

    return (
        <>
            <header className="h-16 glass flex items-center justify-between px-6 border-b drag-region relative z-50 transition-opacity duration-300">
                <div className={`flex items-center gap-4 no-drag relative ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} ref={dropdownRef}>
                    {/* Project Selector Dropdown */}
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 hover:bg-accent px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <h2 className="font-semibold text-sm truncate max-w-[250px]">
                            {currentProject?.title || 'Select Project'}
                        </h2>
                        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {currentProject && (
                        <span className="text-[10px] bg-accent px-2 py-0.5 rounded text-muted-foreground uppercase">
                            {currentProject.status || 'Draft'}
                        </span>
                    )}

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                            {/* Project List */}
                            <div className="max-h-64 overflow-y-auto">
                                {projects.length > 0 ? (
                                    projects.map((project) => (
                                        <button
                                            key={project.id}
                                            onClick={() => handleSelectProject(project.id)}
                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors ${currentProject?.id === project.id ? 'bg-primary/10' : ''
                                                }`}
                                        >
                                            <FolderOpen size={16} className={currentProject?.id === project.id ? 'text-primary' : 'text-muted-foreground'} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${currentProject?.id === project.id ? 'text-primary' : ''}`}>
                                                    {project.title}
                                                </p>
                                                {project.genre && (
                                                    <p className="text-xs text-muted-foreground truncate">{project.genre}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                        No projects yet
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="border-t border-border">
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        onNewProject();
                                    }}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors text-sm"
                                >
                                    <Plus size={16} className="text-primary" />
                                    <span>New Project</span>
                                </button>
                                {currentProject && (
                                    <button
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setShowDeleteConfirm(true);
                                        }}
                                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-destructive/10 transition-colors text-sm text-destructive"
                                    >
                                        <Trash2 size={16} />
                                        <span>Delete Project</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 no-drag">
                    {/* Focus Mode Toggle */}
                    <button
                        onClick={() => setFocusMode(!isFocusMode)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isFocusMode
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                            }`}
                    >
                        {isFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        <span>{isFocusMode ? 'Exit Focus' : 'Focus Mode'}</span>
                    </button>

                    <div className="w-[1px] h-6 bg-border mx-2" />

                    {/* Export Dropdown */}
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent rounded-lg text-sm text-muted-foreground transition-colors"
                            title="Export"
                        >
                            <Share size={16} />
                            <span>Export</span>
                            <ChevronDown size={14} className={`transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isExportOpen && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                                <div className="p-1">
                                    <button
                                        onClick={handleExportToWord}
                                        disabled={!currentProject || exportStatus === 'exporting'}
                                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {exportStatus === 'exporting' ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <FileType size={14} />
                                        )}
                                        <span>
                                            {exportStatus === 'exporting' ? 'Exporting...' :
                                                exportStatus === 'success' ? 'Exported!' :
                                                    exportStatus === 'error' ? 'Export Failed' :
                                                        'Export as Word (.docx)'}
                                        </span>
                                    </button>
                                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent flex items-center gap-2 opacity-50 cursor-not-allowed">
                                        <FileText size={14} />
                                        <span>Export as PDF</span>
                                        <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                                    </button>
                                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent flex items-center gap-2 opacity-50 cursor-not-allowed">
                                        <Download size={14} />
                                        <span>Export as Markdown</span>
                                        <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                                    </button>
                                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent flex items-center gap-2 opacity-50 cursor-not-allowed">
                                        <FileJson size={14} />
                                        <span>Export as JSON</span>
                                        <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 no-drag">
                    <div className="bg-card border border-border w-full max-w-md p-6 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-destructive/10 rounded-full">
                                <Trash2 size={24} className="text-destructive" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Delete Project</h3>
                                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete <span className="font-medium text-foreground">"{currentProject?.title}"</span>?
                            All chapters and content will be permanently removed.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/80 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
