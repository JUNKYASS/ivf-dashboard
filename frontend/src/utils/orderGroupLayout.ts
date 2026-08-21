export type FabricSplitMode = 'none' | 'all' | 'fabric-only';

export function getFabricSplitMode(groupKey: string): FabricSplitMode {
  if (groupKey === 'bedding' || groupKey.startsWith('filter-')) {
    return 'none';
  }
  if (groupKey === 'unmapped') return 'fabric-only';
  return 'all';
}
