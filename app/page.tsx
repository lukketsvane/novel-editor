'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import FileBrowser from './file-browser'
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Save } from 'lucide-react'

// Dynamically import TiptapEditor with SSR disabled
const TiptapEditor = dynamic(() => import('./tiptap-editor'), {
  ssr: false,
})

export default function Page() {
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState('')
  const { toast } = useToast()

  const handleFileSelect = useCallback(async (path: string) => {
    try {
      const response = await fetch(`/api/github?path=${encodeURIComponent(path)}`)
      if (!response.ok) throw new Error('Failed to fetch file content')
      const data = await response.json()
      setContent(data.content)
      setSelectedFile(path)
    } catch (error) {
      console.error('Error fetching file:', error)
      toast({
        title: "Error",
        description: "Failed to load file content",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  const handleSave = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "No file selected",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save file')
      }

      toast({
        title: "Success",
        description: `File ${selectedFile} has been successfully saved.`,
      })
    } catch (error) {
      console.error('Error saving file:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save file",
        variant: "destructive",
      })
    }
  }, [content, selectedFile, toast])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="w-1/4 h-full overflow-auto border-r">
        <FileBrowser onFileSelect={handleFileSelect} />
      </div>
      <div className="w-3/4 h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold truncate">{selectedFile}</h2>
          <Button onClick={handleSave} disabled={!selectedFile}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
        <div className="flex-grow overflow-auto">
          <TiptapEditor onSave={handleContentChange} initialContent={content} />
        </div>
      </div>
    </div>
  )
}