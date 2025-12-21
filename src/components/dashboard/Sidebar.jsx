import React from 'react';
import { LayoutGrid, Clock, FolderOpen, Star, PlusCircle } from 'lucide-react';

export default function Sidebar({ activeFilter, onFilterChange }) {
    const mainFilters = [
        { id: 'all', label: 'All Recipes', icon: LayoutGrid },
        { id: 'drafts', label: 'Processing', icon: Clock },
        { id: 'recent', label: 'Recently Added', icon: Star },
    ];

    const folders = [
        { id: 'folder1', label: 'Dinner Ideas', icon: FolderOpen },
        { id: 'folder2', label: 'Desserts', icon: FolderOpen },
    ];

    return (
        <div className="w-64 bg-zinc-950 border-r border-white/10 flex flex-col h-full">
            <div className="p-4">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">Library</h2>
                <div className="space-y-1">
                    {mainFilters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => onFilterChange(filter.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === filter.id
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <filter.icon size={18} />
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 pt-0">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2 flex items-center justify-between group">
                    Collections
                    <button className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity">
                        <PlusCircle size={14} />
                    </button>
                </h2>
                <div className="space-y-1">
                    {folders.map((folder) => (
                        <button
                            key={folder.id}
                            onClick={() => onFilterChange(folder.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === folder.id
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <folder.icon size={18} />
                            {folder.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-white/10">
                <div className="bg-zinc-900 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white">Storage</span>
                        <span className="text-xs text-muted-foreground">75%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full w-3/4" />
                    </div>
                </div>
            </div>
        </div>
    );
}
