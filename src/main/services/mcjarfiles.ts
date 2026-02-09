import { createWriteStream } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { ReadableStream as NodeReadableStream } from 'stream/web'

const API_BASE = 'https://mcjarfiles.com/api'

export type McJarType = 'vanilla' | 'servers' | 'modded' | 'bedrock' | 'proxies'
export type McJarPlatform = 'windows' | 'linux'

export type McJarRequest = {
  type: McJarType
  variant: string
  version?: string
  platform?: McJarPlatform
  latest?: boolean
}

const buildPath = ({ type, variant, version, platform, latest }: McJarRequest): string => {
  const parts: string[] = [latest ? 'get-latest-jar' : 'get-jar', type, variant]
  if (type === 'bedrock') {
    if (!platform) {
      throw new Error('Bedrock requires platform path segment.')
    }
    parts.push(platform)
  }
  if (!latest) {
    if (!version) {
      throw new Error('Version is required for get-jar.')
    }
    parts.push(version)
  }
  return `${API_BASE}/${parts.join('/')}`
}

export const buildVersionsUrl = (type: McJarType, variant: string, platform?: McJarPlatform): string => {
  const parts: string[] = ['get-versions', type, variant]
  if (type === 'bedrock') {
    if (!platform) {
      throw new Error('Bedrock requires platform path segment.')
    }
    parts.push(platform)
  }
  return `${API_BASE}/${parts.join('/')}`
}

export const buildVersionInfoUrl = (
  type: McJarType,
  variant: string,
  version: string,
  platform?: McJarPlatform
): string => {
  const parts: string[] = ['get-version-info', type, variant]
  if (type === 'bedrock') {
    if (!platform) {
      throw new Error('Bedrock requires platform path segment.')
    }
    parts.push(platform)
  }
  parts.push(version)
  return `${API_BASE}/${parts.join('/')}`
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`MCJarFiles request failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export const getVersions = async (type: McJarType, variant: string, platform?: McJarPlatform): Promise<string[]> => {
  const url = buildVersionsUrl(type, variant, platform)
  return fetchJson<string[]>(url)
}

export const getVersionInfo = async (
  type: McJarType,
  variant: string,
  version: string,
  platform?: McJarPlatform
): Promise<unknown> => {
  const url = buildVersionInfoUrl(type, variant, version, platform)
  return fetchJson<unknown>(url)
}

export const downloadJar = async (request: McJarRequest, destination: string): Promise<string> => {
  const url = buildPath(request)
  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download jar: ${res.status} ${res.statusText}`)
  }
  const stream = Readable.fromWeb(res.body as NodeReadableStream)
  await pipeline(stream, createWriteStream(destination))
  return url
}
