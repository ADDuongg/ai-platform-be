/** True when the caller has catalog UPDATE permission (draft visibility). */
export function canSeeCatalogDrafts(permissions: string[], updatePermission: string): boolean {
  return permissions.includes(updatePermission);
}
