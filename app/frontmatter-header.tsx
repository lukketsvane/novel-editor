'use client'

import { useState } from 'react'
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

interface FrontmatterHeaderProps {
  onUpdate: (frontmatter: string) => void
}

export default function FrontmatterHeader({ onUpdate }: FrontmatterHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [tags, setTags] = useState('')
  const [type, setType] = useState('')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState('')

  const updateFrontmatter = () => {
    const frontmatter = `---
title: ${title}
description: ${description}
date: ${date}
tags: [${tags}]
type: ${type}
category: ${category}
image: ${image}
---`
    onUpdate(frontmatter)
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
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor="date" className="text-xs">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor="tags" className="text-xs">Tags</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label htmlFor="type" className="text-xs">Type</Label>
            <Select onValueChange={setType} value={type}>
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
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-8" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="image" className="text-xs">Image URL</Label>
            <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} className="h-8" />
          </div>
        </div>
        <Button onClick={updateFrontmatter} className="w-full mt-2">Update Frontmatter</Button>
      </CollapsibleContent>
    </Collapsible>
  )
}