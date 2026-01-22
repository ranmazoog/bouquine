export interface Project {
    id: string;
    title: string;
    genre?: string;
    audience?: string;
    target_word_count: number;
    status: 'draft' | 'completed' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface Chapter {
    id: string;
    project_id: string;
    chapter_number: number;
    title?: string;
    outline?: string;
    content: string;
    summary?: string;
    word_count: number;
    status: 'outline' | 'draft' | 'revision' | 'polished';
    created_at: string;
    updated_at: string;
}
