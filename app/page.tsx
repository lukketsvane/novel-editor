'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import FileBrowser from './file-browser'
import FrontmatterHeader from './frontmatter-header'
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [frontmatter, setFrontmatter] = useState<Record<string, any>>({})
  const { toast } = useToast()

  const handleFileSelect = async (path: string) => {
    try {
      const response = await fetch(`/api/github?path=${encodeURIComponent(path)}`)
      if (!response.ok) throw new Error('Failed to fetch file content')
      const data = await response.json()
      setSelectedFile(path)
      
      const { frontmatter: parsedFrontmatter, content: parsedContent } = parseFrontmatter(data.content)
      setFrontmatter(parsedFrontmatter)
      setContent(parsedContent)
    } catch (error) {
      console.error('Error fetching file:', error)
      toast({
        title: "Error",
        description: "Failed to load file content",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!selectedFile) return

    try {
      const fullContent = `---\n${Object.entries(frontmatter)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`)
        .join('\n')}\n---\n\n${content}`

      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fullContent }),
      })
      if (!response.ok) throw new Error('Failed to save file')
      toast({
        title: "Success",
        description: "File saved successfully",
      })
    } catch (error) {
      console.error('Error saving file:', error)
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      })
    }
  }

  const parseFrontmatter = (rawContent: string) => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/
    const match = rawContent.match(frontmatterRegex)
    
    if (match) {
      const frontmatterString = match[1]
      const content = rawContent.slice(match[0].length)
      const frontmatter = {}
      frontmatterString.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':').map(part => part.trim())
        const value = valueParts.join(':').trim()
        if (key && value) {
          frontmatter[key] = value.startsWith('[') && value.endsWith(']') 
            ? value.slice(1, -1).split(',').map(item => item.trim())
            : value
        }
      })
      return { frontmatter, content }
    }
    
    return { frontmatter: {}, content: rawContent }
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/4 border-r">
        <FileBrowser onFileSelect={handleFileSelect} />
      </div>
      <div className="w-3/4 p-4 flex flex-col">
        {selectedFile ? (
          <>
            <FrontmatterHeader
              frontmatter={frontmatter}
              onUpdate={setFrontmatter}
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-grow my-4"
              placeholder="Enter your content here..."
            />
            <Button onClick={handleSave} className="mt-4">Save</Button>
          </>
        ) : (
          <p>Select a file to edit</p>
        )}
      </div>
    </div>
  )
}