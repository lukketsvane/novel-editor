import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: process.env.GITHUB_PAT })

const owner = 'lukketsvane'
const repo = 'personal-web'

export async function fetchDirectoryContents(path: string): Promise<Array<{ name: string; path: string; type: string }>> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    if (!Array.isArray(data)) throw new Error('Expected directory contents, received file')
    
    return await Promise.all(data.map(async item => ({
      name: item.name,
      path: item.path,
      type: item.type,
      ...(item.type === 'dir' ? { children: await fetchDirectoryContents(item.path) } : {})
    })))
  } catch (error) {
    console.error(`Error fetching contents for path ${path}:`, error)
    return []
  }
}

export async function createOrUpdateFile(path: string, content: string, message: string): Promise<void> {
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
    })
  } catch (error) {
    console.error(`Error creating/updating file ${path}:`, error)
    throw error
  }
}

export async function deleteFile(path: string, message: string): Promise<void> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    if (Array.isArray(data)) throw new Error('Expected file, received directory')
    
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha: data.sha,
    })
  } catch (error) {
    console.error(`Error deleting file ${path}:`, error)
    throw error
  }
}