'use client'

import { useState, useEffect, useCallback, KeyboardEvent } from 'react'
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const fetchFiles = useCallback(async () => {
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
        throw new Error('Failed to rename item')
      }
    } catch (error) {
      console.error('Error renaming item:', error)
      toast({
        title: "Error",
        description: "Failed to rename item",
        variant: "destructive",
      })
    }
    setEditingPath(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && selectedItems.size > 0) {
      e.preventDefault()
      deleteSelectedItems()
    }
  }

  const deleteSelectedItems = async () => {
    for (const path of selectedItems) {
      try {
        const response = await fetch('/api/github', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        })
        if (!response.ok) {
          throw new Error(`Failed to delete ${path}`)
        }
      } catch (error) {
        console.error('Error deleting item:', error)
        toast({
          title: "Error",
          description: `Failed to delete ${path}`,
          variant: "destructive",
        })
      }
    }
    fetchFiles()
    setSelectedItems(new Set())
    toast({
      title: "Success",
      description: "Selected items deleted successfully",
    })
  }

  const toggleItemSelection = (path: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ marginLeft: `${level * 20}px` }} onKeyDown={handleKeyDown} tabIndex={0}>
        {node.type === 'dir' ? (
          <div>
            <Button
              variant="ghost"
              className={`w-full justify-start ${selectedItems.has(node.path) ? 'bg-secondary' : ''}`}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleRename(node.path, editingName)}
                  autoFocus
                />
              ) : (
                <span onClick={(e) => { e.stopPropagation(); toggleItemSelection(node.path); }}>{node.name}</span>
              )}
            </Button>
            {expandedFolders.has(node.path) && node.children && renderFileTree(node.children, level + 1)}
          </div>
        ) : (
          <Button
            variant="ghost"
            className={`w-full justify-start ${selectedItems.has(node.path) ? 'bg-secondary' : ''}`}
            onClick={() => onFileSelect(node.path)}
            onDoubleClick={() => handleDoubleClick(node.path, node.name)}
          >
            <File className="w-4 h-4 mr-2" />
            {editingPath === node.path ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(node.path, editingName)}
                onKeyPress={(e) => e.key === 'Enter' && handleRename(node.path, editingName)}
                autoFocus
              />
            ) : (
              <span onClick={(e) => { e.stopPropagation(); toggleItemSelection(node.path); }}>{node.name}</span>
            )}
          </Button>
        )}
      </div>
    ))
  }

  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="text-lg font-semibold mb-4">Repository Files</h2>
      {renderFileTree(files)}
    </div>
  )
}