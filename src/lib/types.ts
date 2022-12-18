export type Link = {
  source: string
  sourceHost: string
  host: string
  url: string
}

export type Page = {
  url: string
  host: string
  status: number
  type: 'html' | 'error' | 'other'
  data: string
  links: Array<Link>
}

export type Site = {
  name: string
}

export type ToBeVisited = {
  url: string
  host: string
  date: Date
  processing: boolean
}

export type QueueItem = {
  url: string
  processing: boolean
  date: Date
}

export type CooldownHost = {
  expireAt: Date
  hostname: string
}

export type LinkLookup = {
  [host: string]: Array<Link>
}

export type Unqiues = {
  [key: string]: boolean
}

export type Counts = {
  [key: string]: number
}

export type ObjectLookup = {
  [id: string]: Object
}