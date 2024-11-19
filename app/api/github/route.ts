import { NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

if (!process.env.GITHUB_PAT) {
  console.error('GITHUB_PAT is not set in the environment variables')
  process.exit(1)
}

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
    throw error
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')

  try {
    if (path) {
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path })
        if ('content' in data) {
          return NextResponse.json({
            content: data.content,
            encoding: data.encoding,
            sha: data.sha,
          })
        } else {
          throw new Error('Requested path is not a file')
        }
      } catch (error) {
        if (error instanceof Error && 'status' in error && (error as any).status === 404) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }
        throw error
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
    const { path, content, isFolder } = await request.json()
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (isFolder) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `${path}/.gitkeep`,
        message: `Create folder ${path}`,
        content: Buffer.from('').toString('base64'),
      })
    } else {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Create ${path}`,
        content: Buffer.from(content || '').toString('base64'),
      })
    }

    return NextResponse.json({ message: isFolder ? 'Folder created successfully' : 'File created successfully' })
  } catch (error) {
    console.error('Error in POST:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { oldPath, newName } = await request.json()
    if (!oldPath || !newName) {
      return NextResponse.json({ error: 'Old path and new name are required' }, { status: 400 })
    }

    const newPath = oldPath.split('/').slice(0, -1).concat(newName).join('/')

    const { data: content } = await octokit.repos.getContent({ owner, repo, path: oldPath })

    if (Array.isArray(content) || !('content' in content)) {
      return NextResponse.json({ error: 'Cannot move a directory or non-file object' }, { status: 400 })
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: newPath,
      message: `Move ${oldPath} to ${newPath}`,
      content: content.content,
      sha: content.sha,
    })

    await octokit.repos.deleteFile({
      owner,
      repo,
      path: oldPath,
      message: `Delete ${oldPath} after moving to ${newPath}`,
      sha: content.sha,
    })

    return NextResponse.json({ message: 'File moved successfully' })
  } catch (error) {
    console.error('Error in PUT:', error)
    return NextResponse.json({ error: 'Failed to move file', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { path, confirmDelete } = await request.json()
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (!confirmDelete) {
      return NextResponse.json({ message: 'Deletion requires confirmation' }, { status: 400 })
    }

    const { data: content } = await octokit.repos.getContent({ owner, repo, path })

    if (!('sha' in content)) {
      throw new Error('Cannot delete a non-file object')
    }

    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message: `Delete ${path}`,
      sha: content.sha,
    })

    return NextResponse.json({ message: 'File deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}