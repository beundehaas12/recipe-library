import { createClient } from '@/lib/supabase/server';
import ContentEditor from '@/components/admin/ContentEditor';
import type { SiteContent } from '@/types/database';

export default async function ContentPage() {
    const supabase = await createClient();

    // Fetch site content
    const { data: siteContent } = await supabase
        .from('site_content')
        .select('*')
        .in('key', ['login_about', 'login_author']);

    // Transform to a keyed object for easier access
    const contentMap = (siteContent as SiteContent[] | null)?.reduce((acc, item) => {
        acc[item.key] = item;
        return acc;
    }, {} as Record<string, SiteContent>) || {};

    return <ContentEditor initialContent={contentMap} />;
}
