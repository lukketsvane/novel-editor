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

async function handleFileOperation(operation: string, params: any) {
  try {
    switch (operation) {
      case 'createFile':
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: params.path,
          message: `Create ${params.path}`,
          content: Buffer.from(params.content).toString('base64'),
        })
        break
      case 'updateFile':
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: params.path,
          message: `Update ${params.path}`,
          content: Buffer.from(params.content).toString('base64'),
          sha: params.sha,
        })
        break
      case 'deleteFile':
        await octokit.repos.deleteFile({
          owner,
          repo,
          path: params.path,
          message: `Delete ${params.path}`,
          sha: params.sha,
        })
        break
      case 'moveFile':
        const content = await octokit.repos.getContent({
          owner,
          repo,
          path: params.oldPath,
        })

        if (Array.isArray(content.data)) {
          throw new Error('Cannot move a directory')
        }

        if (!('content' in content.data)) {
          throw new Error('Cannot move this type of object')
        }

        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: params.newPath,
          message: `Move ${params.oldPath} to ${params.newPath}`,
          content: content.data.content,
          sha: content.data.sha,
        })

        await handleFileOperation('deleteFile', {
          path: params.oldPath,
          sha: content.data.sha,
        })
        break
      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }
  } catch (error) {
    console.error(`Error in ${operation}:`, error)
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
        return NextResponse.json({
          content: Buffer.from(data.content, 'base64').toString('utf-8'),
          sha: data.sha,
        })
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
    const { path, content, isFolder } = await request.json()
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    if (isFolder) {
      // Create a .gitkeep file to represent an empty folder
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
    const newPath = oldPath.split('/').slice(0, -1).concat(newName).join('/')

    await handleFileOperation('moveFile', { oldPath, newPath })

    return NextResponse.json({ message: 'File renamed successfully' })
  } catch (error) {
    console.error('Error in PUT:', error)
    if (error instanceof Error) {
      if (error.message === 'Cannot move a directory' || error.message === 'Cannot move this type of object') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { path } = await request.json()
    const { data } = await octokit.repos.getContent({ owner, repo, path })

    if (!('sha' in data)) {
      throw new Error('Cannot delete a non-file object')
    }

    await handleFileOperation('deleteFile', { path, sha: data.sha })

    return NextResponse.json({ message: 'File deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}