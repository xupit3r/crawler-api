export type Page = {
  url: string
  host: string
  status: number
  type: 'html' | 'error' | 'other'
  data: string
};

export type Link = {
  source: string
  sourceHost: string
  host: string
  url: string
}

export type ToBeVisited = {
  url: string
  host: string
  date: Date
}

export type CooldownHost = {
  expireAt: Date
  hostname: string
}