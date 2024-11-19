'use client'

import { useState, useCallback, KeyboardEvent, useEffect, useRef } from 'react'
import { Folder, File, ChevronRight, ChevronDown, Upload, Loader } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir' | 'submodule' | 'symlink'
  children?: FileNode[]
}

interface FileBrowserProps {
  onFileSelect: (path: string) => void
}

export default function FileBrowser({ onFileSelect }: FileBrowserProps) {
  const [files, setFiles] = useState<FileNode[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/github')
      if (!response.ok) throw new Error('Failed to fetch files')
      const data = await response.json()
      setFiles(data)
    } catch (error) {
      console.error('Error fetching files:', error)
      toast({
        title: "Error",
        description: "Failed to load file system",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  const handleDoubleClick = (path: string, name: string) => {
    setEditingPath(path)
    setEditingName(name)
  }

  const handleRename = async (oldPath: string, newName: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/github', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newName }),
      })
      if (response.ok) {
        fetchFiles()
        toast({
          title: "Success",
          description: "Item renamed successfully",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to rename item')
      }
    } catch (error) {
      console.error('Error renaming item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename item",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setEditingPath(null)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target?.result as string
      try {
        const response = await fetch('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            path: file.name, 
            content: content.split(',')[1] // Remove the data URL prefix
          }),
        })
        if (!response.ok) throw new Error('Failed to upload file')
        toast({
          title: "Success",
          description: "File uploaded successfully",
        })
        fetchFiles()
      } catch (error) {
        console.error('Error uploading file:', error)
        toast({
          title: "Error",
          description: "Failed to upload file",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, path: string) => {
    if (e.key === 'Enter' && editingPath === path) {
      handleRename(path, editingName)
    }
  }

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ marginLeft: `${level * 20}px` }} onKeyDown={(e) => handleKeyDown(e, node.path)}>
        {node.type === 'dir' ? (
          <div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => toggleFolder(node.path)}
              onDoubleClick={() => handleDoubleClick(node.path, node.name)}
            >
              {expandedFolders.has(node.path) ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
              <Folder className="w-4 h-4 mr-2" />
              {editingPath === node.path ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleRename(node.path, editingName)}
                  autoFocus
                />
              ) : (
                node.name
              )}
            </Button>
            {expandedFolders.has(node.path) && node.children && renderFileTree(node.children, level + 1)}
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => onFileSelect(node.path)}
            onDoubleClick={() => handleDoubleClick(node.path, node.name)}
          >
            <File className="w-4 h-4 mr-2" />
            {editingPath === node.path ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(node.path, editingName)}
                autoFocus
              />
            ) : (
              node.name
            )}
          </Button>
        )}
      </div>
    ))
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Repository Files</h2>
        <div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            ref={fileInputRef}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
          </Button>
        </div>
      </div>
      {isLoading && !files.length ? (
        <div className="flex justify-center items-center h-full">
          <Loader className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        renderFileTree(files)
      )}
    </div>
  )
}