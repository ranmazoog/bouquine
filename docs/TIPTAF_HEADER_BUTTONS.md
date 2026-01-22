# Technical Implementation Guide: H2 & H3 Header Buttons for TipTap Bubble Menu

## Overview

This guide details how to add distinct H2 (Section) and H3 (Sub-section) header buttons to a TipTap editor's floating bubble menu. The implementation intentionally excludes H1 headers, as they serve a special purpose in this application.

## Why H1 is Excluded

H1 headers are reserved for **chapter titles** in this application:

1. **Semantic Distinction**: Chapter titles are structural metadata, not inline content. They appear in navigation and outlines, separate from the prose flow.

2. **Authoring Workflow**: Writers begin with chapter titles set elsewhere (Sidebar or Corkboard), then write content that naturally flows from H2 → H3 → body text.

3. **Navigation Clarity**: The sidebar navigation tracks H1-level items as chapter markers. Allowing H1 in the editor would create duplicate/competing chapter structures.

4. **Cognitive Load**: Reducing options from 4 (H1-H4) to 3 (H2-H4) in the bubble menu simplifies the authoring experience.

## Implementation

### Step 1: Extend the Bubble Menu Configuration

```typescript
// components/editor/BubbleMenu.tsx
import { BubbleMenu } from '@tiptap/react';
import { Heading2, Heading3, Type } from 'lucide-react';

interface EditorBubbleMenuProps {
    editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1"
        >
            {/* Body text toggle */}
            <button
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={`p-2 rounded hover:bg-accent ${
                    !editor.isActive('heading') ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
                title="Body text"
            >
                <Type size={16} />
            </button>

            {/* H2 - Section Header */}
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-2 rounded hover:bg-accent ${
                    editor.isActive('heading', { level: 2 }) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
                title="Section (H2)"
            >
                <Heading2 size={16} />
            </button>

            {/* H3 - Sub-section Header */}
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-2 rounded hover:bg-accent ${
                    editor.isActive('heading', { level: 3 }) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
                title="Sub-section (H3)"
            >
                <Heading3 size={16} />
            </button>

            {/* Separator for visual clarity */}
            <div className="w-px h-4 bg-border mx-1" />

            {/* Existing formatting buttons (bold, italic, etc.) */}
            {/* ... */}
        </BubbleMenu>
    );
}
```

### Step 2: Configure TipTap StarterKit for Heading Support

```typescript
// hooks/useEditor.ts
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const editor = useEditor({
    extensions: [
        StarterKit.configure({
            heading: {
                levels: [2, 3], // Explicitly support only H2 and H3
            },
        }),
        // ... other extensions
    ],
});
```

### Step 3: Keyboard Shortcuts (Optional Enhancement)

```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

export function useKeyboardShortcuts(editor: Editor) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + 2 → H2
            if ((e.ctrlKey || e.metaKey) && e.key === '2') {
                e.preventDefault();
                editor.chain().focus().toggleHeading({ level: 2 }).run();
            }

            // Ctrl/Cmd + 3 → H3
            if ((e.ctrlKey || e.metaKey) && e.key === '3') {
                e.preventDefault();
                editor.chain().focus().toggleHeading({ level: 3 }).run();
            }

            // Ctrl/Cmd + 0 → Body text
            if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                editor.chain().focus().setParagraph().run();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [editor]);
}
```

## UI/UX Considerations

### Button Layout

1. **Consistent Ordering**: Body → H2 → H3 maintains the document hierarchy visually.

2. **Visual Feedback**: Active state should clearly indicate the current heading level using:
   - Background color (primary/10)
   - Text color (primary)
   - Icon highlighting

3. **Tooltips**: Each button should have a descriptive tooltip:
   - "Section (H2) - Ctrl+2"
   - "Sub-section (H3) - Ctrl+3"
   - "Body text - Ctrl+0"

4. **Separator**: Add a subtle visual separator between header buttons and text formatting to group related functions.

### Accessibility

1. **ARIA Labels**: Ensure buttons have accessible labels:
   ```tsx
   <button
       onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
       aria-label="Apply H2 section heading"
       title="Section (H2) - Ctrl+2"
   >
       <Heading2 size={16} />
   </button>
   ```

2. **Keyboard Navigation**: The bubble menu should support keyboard navigation (Tab/Shift+Tab to cycle through buttons).

3. **Focus Styles**: Maintain visible focus indicators for keyboard users.

### Visual Design

1. **Icon Consistency**: Use icons that match the application's design system (e.g., Lucide icons).

2. **Size Consistency**: Buttons should match other bubble menu buttons in size and padding.

3. **Hover States**: Subtle hover background change to indicate interactivity.

## Complete Component Example

```tsx
// components/editor/BubbleMenu.tsx
import { BubbleMenu } from '@tiptap/react';
import { Type, Heading2, Heading3, Bold, Italic, Strikethrough } from 'lucide-react';

export function EditorBubbleMenu({ editor }: { editor: Editor }) {
    if (!editor) return null;

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-xl p-1"
        >
            {/* Text formatting group */}
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded ${
                    editor.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                }`}
                title="Bold (Ctrl+B)"
            >
                <Bold size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded ${
                    editor.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                }`}
                title="Italic (Ctrl+I)"
            >
                <Italic size={14} />
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-border mx-1" />

            {/* Typography group */}
            <button
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={`p-1.5 rounded ${
                    !editor.isActive('heading') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                }`}
                title="Body text (Ctrl+0)"
            >
                <Type size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded ${
                    editor.isActive('heading', { level: 2 }) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                }`}
                title="Section H2 (Ctrl+2)"
            >
                <Heading2 size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-1.5 rounded ${
                    editor.isActive('heading', { level: 3 }) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                }`}
                title="Sub-section H3 (Ctrl+3)"
            >
                <Heading3 size={14} />
            </button>
        </BubbleMenu>
    );
}
```

## Summary

| Feature | Implementation |
|---------|---------------|
| H2 Button | `toggleHeading({ level: 2 })` + Heading2 icon |
| H3 Button | `toggleHeading({ level: 3 })` + Heading3 icon |
| H1 Excluded | Configured in StarterKit levels + no button |
| Keyboard Shortcuts | Ctrl+2 (H2), Ctrl+3 (H3), Ctrl+0 (body) |
| Active States | Background + color changes |

This implementation maintains a clean, focused authoring experience while respecting the document structure of the application.
