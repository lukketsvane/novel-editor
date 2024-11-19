'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface Frontmatter {
  [key: string]: string | string[];
}

interface FrontmatterHeaderProps {
  frontmatter: Frontmatter;
  onUpdate: (frontmatter: Frontmatter) => void;
  filePath: string;
}

export default function FrontmatterHeader({ frontmatter, onUpdate, filePath }: FrontmatterHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [fields, setFields] = useState(frontmatter)
  const { toast } = useToast()

  useEffect(() => {
    setFields(frontmatter)
  }, [frontmatter])

  const handleChange = (key: string, value: any) => {
    const updatedFields = { ...fields, [key]: value }
    setFields(updatedFields)
    onUpdate(updatedFields)
  }

  const handleSave = async () => {
    try {
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path: filePath,
          frontmatter: fields,
          action: 'updateFrontmatter'
        }),
      })
      if (!response.ok) throw new Error('Failed to save frontmatter')
      toast({
        title: "Success",
        description: "Frontmatter saved successfully",
      })
    } catch (error) {
      console.error('Error saving frontmatter:', error)
      toast({
        title: "Error",
        description: "Failed to save frontmatter",
        variant: "destructive",
      })
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="flex justify-between w-full p-2">
          <span>Frontmatter</span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="title" className="text-xs">Title</Label>
            <Input id="title" value={fields.title || ''} onChange={(e) => handleChange('title', e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Input id="description" value={fields.description || ''} onChange={(e) => handleChange('description', e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Input id="date" type="date" value={fields.date || ''} onChange={(e) => handleChange('date', e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor="tags" className="text-xs">Tags</Label>
            <Input id="tags" value={Array.isArray(fields.tags) ? fields.tags.join(', ') : fields.tags || ''} 
           onChange={(e) => handleChange('tags', e.target.value.split(',').map(tag => tag.trim()))} className="h-8" />
          </div>
          <div>
            <Label htmlFor="type" className="text-xs">Type</Label>
            <Select onValueChange={(value) => handleChange('type', value)} value={fields.type as string || ''}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="blog">Blog</SelectItem>
                <SelectItem value="page">Page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="category" className="text-xs">Category</Label>
            <Input id="category" value={fields.category || ''} onChange={(e) => handleChange('category', e.target.value)} className="h-8" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="image" className="text-xs">Image URL</Label>
            <Input id="image" value={fields.image || ''} onChange={(e) => handleChange('image', e.target.value)} className="h-8" />
          </div>
        </div>
        <Button onClick={handleSave} className="mt-2">Save Frontmatter</Button>
      </CollapsibleContent>
    </Collapsible>
  )
}