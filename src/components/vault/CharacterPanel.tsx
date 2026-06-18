import { useState, useEffect } from 'react';
import { Plus, Trash2, User } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useVaultStore } from '../../stores/projectStore';
import { toast } from '../../lib/toast';
import type { Character } from '../../types/electron';

export function CharacterPanel() {
    const { currentProject } = useProjectStore();
    const {
        characters,
        selectedCharacter,
        setCharacters,
        setSelectedCharacter,
        addCharacter,
        updateCharacterInStore,
        removeCharacter,
    } = useVaultStore();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        role: 'supporting',
        description: '',
        backstory: '',
    });

    // Load characters when project changes
    useEffect(() => {
        const loadCharacters = async () => {
            if (!currentProject) {
                setCharacters([]);
                return;
            }
            try {
                const chars = await window.electronAPI.getCharacters(currentProject.id);
                setCharacters(chars);
            } catch (err) {
                console.error('Failed to load characters:', err);
                toast.error('Unable to load characters.');
            }
        };
        loadCharacters();
    }, [currentProject?.id, setCharacters]);

    // Update form when selection changes
    useEffect(() => {
        if (selectedCharacter) {
            setFormData({
                name: selectedCharacter.name,
                role: selectedCharacter.role,
                description: selectedCharacter.description || '',
                backstory: selectedCharacter.backstory || '',
            });
            setIsEditing(true);
        } else {
            setFormData({ name: '', role: 'supporting', description: '', backstory: '' });
            setIsEditing(false);
        }
    }, [selectedCharacter?.id]);

    const handleCreate = async () => {
        if (!currentProject) return;

        try {
            const newChar = await window.electronAPI.createCharacter({
                project_id: currentProject.id,
                name: 'New Character',
                role: 'supporting',
            });
            addCharacter(newChar);
            setSelectedCharacter(newChar);
            toast.success('Character created.');
        } catch (err) {
            console.error('Failed to create character:', err);
            toast.error('Unable to create character. Please try again.');
        }
    };

    const handleSave = async () => {
        if (!selectedCharacter) return;

        try {
            const updated = await window.electronAPI.updateCharacter(selectedCharacter.id, formData);
            updateCharacterInStore(updated);
        } catch (err) {
            console.error('Failed to save character:', err);
            toast.error('Unable to save character changes.');
        }
    };

    const handleDelete = async (char: Character, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = window.confirm(`Delete "${char.name}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            await window.electronAPI.deleteCharacter(char.id);
            removeCharacter(char.id);
            toast.success(`Deleted "${char.name}".`);
        } catch (err) {
            console.error('Failed to delete character:', err);
            toast.error('Unable to delete character. Please try again.');
        }
    };

    if (!currentProject) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Select a project to manage characters.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex h-full overflow-hidden">
            {/* List Panel */}
            <div className="w-64 border-r flex flex-col">
                <div className="p-3 border-b flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Characters</h3>
                    <button
                        onClick={handleCreate}
                        className="p-1 hover:bg-accent rounded-md transition-colors"
                        title="Add character"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {characters.length > 0 ? (
                        characters.map((char) => (
                            <div
                                key={char.id}
                                onClick={() => setSelectedCharacter(char)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 group cursor-pointer transition-colors ${
                                    selectedCharacter?.id === char.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <User size={14} className="flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="truncate font-medium">{char.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{char.role}</p>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(char, e)}
                                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all flex-shrink-0"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground text-center py-4 italic">
                            No characters yet — add them so the Muse can use them in scenes and suggestions.
                        </p>
                    )}
                </div>
            </div>

            {/* Detail Panel */}
            <div className="flex-1 overflow-y-auto p-6">
                {isEditing && selectedCharacter ? (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                onBlur={handleSave}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Character name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => {
                                    setFormData({ ...formData, role: e.target.value });
                                    setTimeout(handleSave, 0);
                                }}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="protagonist">Protagonist</option>
                                <option value="antagonist">Antagonist</option>
                                <option value="supporting">Supporting</option>
                                <option value="minor">Minor</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                onBlur={handleSave}
                                rows={3}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                placeholder="Physical appearance, personality traits..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Bio / Backstory</label>
                            <textarea
                                value={formData.backstory}
                                onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                                onBlur={handleSave}
                                rows={6}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                placeholder="Character history, motivations, secrets..."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full">
                        <User size={48} className="mb-4 opacity-50" />
                        <p>Select a character to edit or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
