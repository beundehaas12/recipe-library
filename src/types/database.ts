/**
 * Database types for Forkify
 */

export interface Recipe {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    author?: string;
    cuisine?: string;
    prep_time?: string;
    cook_time?: string;
    servings?: number;
    ingredients?: Ingredient[];
    instructions?: string[];
    tags?: string[];
    ai_tags?: string[];
    image_url?: string;
    original_image_url?: string;
    source_url?: string;
    status?: 'draft' | 'processing' | 'complete';
    created_at: string;
    updated_at?: string;
    // Joined data
    author_profile?: AuthorProfile;
}

export interface Ingredient {
    item: string;
    amount?: string;
    unit?: string;
}

export interface Collection {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    is_public: boolean;
    created_at: string;
    updated_at?: string;
    // Computed/joined data
    recipe_count?: number;
    preview_images?: string[];
    author_profile?: AuthorProfile;
}

export interface AuthorProfile {
    user_id: string;
    first_name?: string;
    last_name?: string;
    pen_name?: string;
    avatar_url?: string;
    bio?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    role?: 'user' | 'author' | 'admin';
}

export interface SiteContent {
    id: string;
    key: string;
    title: string;
    subtitle?: string;
    content: Record<string, unknown>;
    updated_at?: string;
    updated_by?: string;
}
