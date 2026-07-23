export enum ArtifactKind {
  TEXT = 'text',
  JSON = 'json',
  IMAGE = 'image',
  IMAGE_SET = 'image_set',
  FILE = 'file',
  URL = 'url',
}

export enum ArtifactPersist {
  INLINE = 'inline',
  BLOB = 'blob',
}

export enum ArtifactStatus {
  READY = 'ready',
  FAILED = 'failed',
}
