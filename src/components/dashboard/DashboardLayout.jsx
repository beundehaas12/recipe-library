import React, { useState } from 'react';
import { ChefHat, Search, Upload, Bell, ChevronLeft, Plus, Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children, user, signOut, activeFilter, onFilterChange }) {
    return (
        <div className="h-screen bg-black text-foreground flex flex-col overflow-hidden">
            {/* Dashboard Toolbar (Finder-style) */}
            <div className="h-14 bg-zinc-950 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <ChefHat size={18} className="text-black" />
                        </div>
                        <h1 className="font-bold text-white tracking-tight">Author Studio</h1>
                    </div>
                </div>

                <div className="flex-1 max-w-xl mx-8">
                    <div className="relative group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-primary text-black rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors">
                        <Upload size={16} />
                        <span>Upload</span>
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <button onClick={signOut} className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 overflow-hidden hover:border-white/30 transition-all">
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <User size={16} />
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Workspace Area (Finder Layout) */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                <Sidebar activeFilter={activeFilter} onFilterChange={onFilterChange} />

                {/* Content Area (List + Preview) */}
                <div className="flex-1 flex min-w-0 bg-background relative min-h-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
