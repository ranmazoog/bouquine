import { useState, useEffect } from 'react';
import { Plus, Trash2, Globe } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useVaultStore } from '../../stores/projectStore';
import type { WorldElement } from '../../types/electron';

const CATEGORIES = [
    'Location',
    'Item',
    'Organization',
    'Culture',
    'Magic System',
    'Technology',
    'History',
    'Other',
];

export function WorldPanel() {
    const { currentProject } = useProjectStore();
    const {
        worldElements,
        selectedWorldElement,
        setWorldElements,
        setSelectedWorldElement,
        addWorldElement,
        updateWorldElementInStore,
        removeWorldElement,
    } = useVaultStore();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Location',
        description: '',
    });

    // Load world elements when project changes
    useEffect(() => {
        const loadWorldElements = async () => {
            if (!currentProject) {
                setWorldElements([]);
                return;
            }
            try {
                const elements = await window.electronAPI.getWorldElements(currentProject.id);
                setWorldElements(elements);
            } catch (err) {
                console.error('Failed to load world elements:', err);
            }
        };
        loadWorldElements();
    }, [currentProject?.id, setWorldElements]);

    // Update form when selection changes
    useEffect(() => {
        if (selectedWorldElement) {
            setFormData({
                name: selectedWorldElement.name,
                category: selectedWorldElement.category,
                description: selectedWorldElement.description || '',
            });
            setIsEditing(true);
        } else {
            setFormData({ name: '', category: 'Location', description: '' });
            setIsEditing(false);
        }
    }, [selectedWorldElement?.id]);

    const handleCreate = async () => {
        if (!currentProject) return;

        try {
            const newElement = await window.electronAPI.createWorldElement({
                project_id: currentProject.id,
                name: 'New Element',
                category: 'Location',
            });
            addWorldElement(newElement);
            setSelectedWorldElement(newElement);
        } catch (err) {
            console.error('Failed to create world element:', err);
        }
    };

    const handleSave = async () => {
        if (!selectedWorldElement) return;

        try {
            const updated = await window.electronAPI.updateWorldElement(selectedWorldElement.id, formData);
            updateWorldElementInStore(updated);
        } catch (err) {
            console.error('Failed to save world element:', err);
        }
    };

    const handleDelete = async (element: WorldElement, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = window.confirm(`Delete "${element.name}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            await window.electronAPI.deleteWorldElement(element.id);
            removeWorldElement(element.id);
        } catch (err) {
            console.error('Failed to delete world element:', err);
        }
    };

    // Group elements by category
    const groupedElements = worldElements.reduce((acc, el) => {
        if (!acc[el.category]) acc[el.category] = [];
        acc[el.category].push(el);
        return acc;
    }, {} as Record<string, WorldElement[]>);

    if (!currentProject) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Select a project to manage world elements.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex h-full overflow-hidden">
            {/* List Panel */}
            <div className="w-64 border-r flex flex-col">
                <div className="p-3 border-b flex items-center justify-between">
                    <h3 className="text-sm font-semibold">World Bible</h3>
                    <button
                        onClick={handleCreate}
                        className="p-1 hover:bg-accent rounded-md transition-colors"
                        title="Add element"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {Object.keys(groupedElements).length > 0 ? (
                        Object.entries(groupedElements).map(([category, elements]) => (
                            <div key={category} className="mb-4">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                                    {category}
                                </h4>
                                <div className="space-y-1">
                                    {elements.map((element) => (
                                        <div
                                            key={element.id}
                                            onClick={() => setSelectedWorldElement(element)}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 group cursor-pointer transition-colors ${
                                                selectedWorldElement?.id === element.id
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            <Globe size={14} className="flex-shrink-0" />
                                            <span className="truncate flex-1">{element.name}</span>
                                            <button
                                                onClick={(e) => handleDelete(element, e)}
                                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-4 italic">
                            No world elements yet. Click + to add one.
                        </p>
                    )}
                </div>
            </div>

            {/* Detail Panel */}
            <div className="flex-1 overflow-y-auto p-6">
                {isEditing && selectedWorldElement ? (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                onBlur={handleSave}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Element name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => {
                                    setFormData({ ...formData, category: e.target.value });
                                    setTimeout(handleSave, 0);
                                }}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                onBlur={handleSave}
                                rows={10}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                placeholder="Describe this element in detail..."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full">
                        <Globe size={48} className="mb-4 opacity-50" />
                        <p>Select an element to edit or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
