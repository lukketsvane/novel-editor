'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'
import { Button } from "@/components/ui/button"
import { Bold, Italic, Code, LinkIcon, List, ListOrdered, ImageIcon, Heading1, Heading2, Heading3 } from 'lucide-react'

interface TiptapEditorProps {
  onSave: (content: string) => void
  initialContent: string
}

export default function TiptapEditor({ onSave, initialContent }: TiptapEditorProps) {
  const [isMounted, setIsMounted] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: true,
        breaks: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown()
      onSave(markdown)
    },
    editable: true,
    injectCSS: true,
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  const setHeading = useCallback((level: 1 | 2 | 3) => {
    editor?.chain().focus().toggleHeading({ level }).run()
  }, [editor])

  const addImage = useCallback(() => {
    const url = window.prompt('Enter the image URL')
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const addLink = useCallback(() => {
    const url = window.prompt('Enter the URL')
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  if (!isMounted) {
    return null
  }

  if (!editor) {
    return null
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-start p-2 border-b sticky top-0 bg-background z-10">
        <Button variant="ghost" size="sm" onClick={() => setHeading(1)}>
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setHeading(2)}>
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setHeading(3)}>
          <Heading3 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
          <Bold className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
          <Italic className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleCode().run()} aria-label="Code">
          <Code className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet List">
          <List className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Ordered List">
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={addLink} aria-label="Add Link">
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={addImage} aria-label="Add Image">
          <ImageIcon className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-grow overflow-auto">
        <EditorContent editor={editor} className="h-full p-4" />
      </div>
      {editor && (
        <BubbleMenu className="flex bg-white shadow-lg rounded-lg overflow-hidden dark:bg-gray-800" editor={editor}>
          <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleCode().run()} aria-label="Code">
            <Code className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={addLink} aria-label="Add Link">
            <LinkIcon className="w-4 h-4" />
          </Button>
        </BubbleMenu>
      )}
    </div>
  )
}