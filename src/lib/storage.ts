import { del, get, set } from 'idb-keyval'
import type { ImportedSource, SavedQuery } from '../types'

const SOURCE_KEY = 'quarry:imported-sources:v1'
const SAVED_QUERY_KEY = 'quarry:saved-queries:v1'

export async function loadImportedSources(): Promise<ImportedSource[]> {
  return (await get<ImportedSource[]>(SOURCE_KEY)) ?? []
}

export async function saveImportedSources(sources: ImportedSource[]): Promise<void> {
  await set(SOURCE_KEY, sources)
}

export async function deleteImportedSource(sourceId: string): Promise<void> {
  const sources = await loadImportedSources()
  await set(
    SOURCE_KEY,
    sources.filter((source) => source.id !== sourceId),
  )
}

export async function clearImportedSources(): Promise<void> {
  await del(SOURCE_KEY)
}

export async function loadSavedQueries(): Promise<SavedQuery[] | null> {
  return (await get<SavedQuery[]>(SAVED_QUERY_KEY)) ?? null
}

export async function saveSavedQueries(queries: SavedQuery[]): Promise<void> {
  await set(SAVED_QUERY_KEY, queries)
}
