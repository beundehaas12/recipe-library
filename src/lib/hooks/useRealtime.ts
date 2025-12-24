'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query/keys';

type Table = 'recipes' | 'collections' | 'recipe_collections';

interface UseRealtimeOptions {
    tables?: Table[];
    enabled?: boolean;
}

/**
 * Hook for Supabase Realtime subscriptions with automatic cache invalidation
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
    const { tables = ['recipes', 'collections'], enabled = true } = options;
    const queryClient = useQueryClient();

    useEffect(() => {
        // Skip if disabled or on server
        if (!enabled || typeof window === 'undefined') return;

        const supabase = createClient();
        const channels: ReturnType<typeof supabase.channel>[] = [];

        // Subscribe to each table
        tables.forEach((table) => {
            const channel = supabase
                .channel(`realtime-${table}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table },
                    (payload) => {
                        console.log(`[Realtime] ${table} change:`, payload.eventType);

                        // Invalidate relevant queries based on the table
                        switch (table) {
                            case 'recipes':
                                queryClient.invalidateQueries({ queryKey: queryKeys.recipes.all });
                                if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
                                    queryClient.invalidateQueries({
                                        queryKey: queryKeys.recipes.detail(payload.new.id as string),
                                    });
                                }
                                break;

                            case 'collections':
                                queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
                                if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
                                    queryClient.invalidateQueries({
                                        queryKey: queryKeys.collections.detail(payload.new.id as string),
                                    });
                                }
                                break;

                            case 'recipe_collections':
                                queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
                                break;
                        }
                    }
                )
                .subscribe();

            channels.push(channel);
        });

        return () => {
            channels.forEach((channel) => {
                supabase.removeChannel(channel);
            });
        };
    }, [queryClient, tables, enabled]);
}

/**
 * Provider component that sets up realtime subscriptions app-wide
 * Only activates on the client side
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Only use realtime when mounted on client
    useRealtime({ enabled: isMounted });

    return children;
}
