'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
    children: React.ReactNode;
    hasMore: boolean;
    isLoading: boolean;
    onLoadMore: () => void;
    threshold?: number;
}

/**
 * Infinite scroll wrapper component with IntersectionObserver
 */
export default function InfiniteScroll({
    children,
    hasMore,
    isLoading,
    onLoadMore,
    threshold = 0.1
}: InfiniteScrollProps) {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries;
            if (entry.isIntersecting && hasMore && !isLoading) {
                onLoadMore();
            }
        },
        [hasMore, isLoading, onLoadMore]
    );

    useEffect(() => {
        observerRef.current = new IntersectionObserver(handleObserver, {
            root: null,
            rootMargin: '100px',
            threshold,
        });

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [handleObserver, threshold]);

    return (
        <div>
            {children}

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
                {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm">Meer laden...</span>
                    </div>
                )}
                {!hasMore && !isLoading && (
                    <span className="text-xs text-muted-foreground/50">
                        Alle recepten geladen
                    </span>
                )}
            </div>
        </div>
    );
}
