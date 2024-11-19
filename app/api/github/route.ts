import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

if (!process.env.GITHUB_PAT) {
  console.error('GITHUB_PAT is not set in the environment variables')
  process.exit(1)
}

console.log('GITHUB_PAT length:', process.env.GITHUB_PAT.length)

const octokit = new Octokit({ auth: process.env.GITHUB_PAT })
const owner = 'lukketsvane'
const repo = 'personal-web'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir' | 'submodule' | 'symlink'
  children?: FileNode[]
}

async function fetchDirectoryContents(path: string): Promise<FileNode[]> {
  try {
    console.log(`Fetching contents for path: ${path}`)
    console.log('Request params:', { owner, repo, path })
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    if (!Array.isArray(data)) throw new Error('Expected directory contents, received file')
    
    return await Promise.all(data.map(async item => {
      const node: FileNode = {
        name: item.name,
        path: item.path,
        type: item.type as 'file' | 'dir' | 'submodule' | 'symlink'
      }
      if (item.type === 'dir') {
        node.children = await fetchDirectoryContents(item.path)
      }
      return node
    }))
  } catch (error) {
    console.error(`Error fetching contents for path ${path}:`, error)
    if (error instanceof Error && 'status' in error && (error as any).status === 401) {
      console.error('Authentication failed. Please check your GITHUB_PAT.')
    }
    throw error
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')

  try {
    if (path) {
      const { data } = await octokit.repos.getContent({ owner, repo, path })
      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64')
        const isImage = path.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
        
        if (isImage) {
          return new Response(content, {
            headers: {
              'Content-Type': `image/${isImage[1]}`,
              'Cache-Control': 'public, max-age=3600',
            },
          })
        } else {
          return NextResponse.json({
            content: content.toString('utf-8'),
            sha: data.sha,
          })
        }
      } else {
        throw new Error('Requested path is not a file')
      }
    } else {
      const files = await fetchDirectoryContents('')
      return NextResponse.json(files)
    }
  } catch (error) {
    console.error('Error in GET:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { path, content, frontmatter, action, isFolder } = await request.json()
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    console.log('POST request received:', { path, action, isFolder })

    if (action === 'updateFrontmatter') {
      // Fetch the current file content
      const { data } = await octokit.repos.getContent({ owner, repo, path })
      if (!('content' in data)) {
        throw new Error('Requested path is not a file')
      }

      const currentContent = Buffer.from(data.content, 'base64').toString('utf-8')
      const [, existingFrontmatter, bodyContent] = currentContent.split('---', 3)

      // Create new frontmatter
      const newFrontmatter = Object.entries(frontmatter)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`)
        .join('\n')

      // Combine new frontmatter with existing body content
      const newContent = `---\n${newFrontmatter}\n---\n\n${bodyContent?.trim() || ''}`

      // Update the file
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Update frontmatter for ${path}`,
        content: Buffer.from(newContent).toString('base64'),
        sha: data.sha,
      })

      return NextResponse.json({ message: 'Frontmatter updated successfully' })
    } else if (isFolder) {
      // Create a .gitkeep file to represent an empty folder
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `${path}/.gitkeep`,
        message: `Create folder ${path}`,
        content: Buffer.from('').toString('base64'),
      })
      return NextResponse.json({ message: 'Folder created successfully' })
    } else {
      // File creation/update logic
      const encodedContent = Buffer.from(content || '').toString('base64')
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Create/Update ${path}`,
        content: encodedContent,
      })
      return NextResponse.json({ message: 'File created/updated successfully' })
    }
  } catch (error) {
    console.error('Error in POST:', error)
    if (error instanceof Error && 'status' in error && (error as any).status === 422) {
      console.error('GitHub API Error:', (error as any).response?.data)
    }
    return NextResponse.json({ error: 'Failed to create/update item', details: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { oldPath, newName } = await request.json()
    const newPath = oldPath.split('/').slice(0, -1).concat(newName).join('/')

    // Fetch the current content
    const { data } = await octokit.repos.getContent({ owner, repo, path: oldPath })

    if (Array.isArray(data)) {
      // This is a directory, we need to move all contents
      await moveDirectory(oldPath, newPath)
    } else if ('content' in data) {
      // This is a file, move it
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: newPath,
        message: `Move ${oldPath} to ${newPath}`,
        content: data.content,
        sha: data.sha,
      })

      // Delete the file at the old path
      await octokit.repos.deleteFile({
        owner,
        repo,
        path: oldPath,
        message: `Delete ${oldPath} after moving to ${newPath}`,
        sha: data.sha,
      })
    } else {
      throw new Error('Unsupported content type')
    }

    return NextResponse.json({ message: 'Item renamed successfully' })
  } catch (error) {
    console.error('Error in PUT:', error)
    return NextResponse.json({ error: 'Failed to rename item', details: (error as Error).message }, { status: 500 })
  }
}

async function moveDirectory(oldPath: string, newPath: string) {
  const { data } = await octokit.repos.getContent({ owner, repo, path: oldPath })
  
  if (!Array.isArray(data)) {
    throw new Error(`Expected directory contents for path: ${oldPath}`)
  }

  for (const item of data) {
    if (item.type === 'file') {
      const fileContent = await octokit.repos.getContent({ owner, repo, path: item.path })
      if ('content' in fileContent.data) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: item.path.replace(oldPath, newPath),
          message: `Move ${item.path} to ${item.path.replace(oldPath, newPath)}`,
          content: fileContent.data.content,
          sha: fileContent.data.sha,
        })
        await octokit.repos.deleteFile({
          owner,
          repo,
          path: item.path,
          message: `Delete ${item.path} after moving to ${item.path.replace(oldPath, newPath)}`,
          sha: item.sha,
        })
      } else {
        console.error(`Unexpected file content for ${item.path}`)
      }
    } else if (item.type === 'dir') {
      await moveDirectory(item.path, item.path.replace(oldPath, newPath))
    }
  }
}

export async function DELETE(request: Request) {
  try {
    const { path } = await request.json()
    const { data } = await octokit.repos.getContent({ owner, repo, path })

    if (Array.isArray(data)) {
      // This is a directory, we need to delete all contents
      await deleteDirectory(path)
    } else if ('sha' in data) {
      // This is a file, delete it
      await octokit.repos.deleteFile({
        owner,
        repo,
        path,
        message: `Delete ${path}`,
        sha: data.sha,
      })
    } else {
      throw new Error('Unsupported content type')
    }

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete item', details: (error as Error).message }, { status: 500 })
  }
}

async function deleteDirectory(path: string) {
  const { data } = await octokit.repos.getContent({ owner, repo, path })
  
  if (!Array.isArray(data)) {
    throw new Error(`Expected directory contents for path: ${path}`)
  }

  for (const item of data) {
    if (item.type === 'file') {
      await octokit.repos.deleteFile({
        owner,
        repo,
        path: item.path,
        message: `Delete ${item.path}`,
        sha: item.sha,
      })
    } else if (item.type === 'dir') {
      await deleteDirectory(item.path)
    }
  }
}

console.log('Updated GitHub API route handler loaded')