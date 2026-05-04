import type { EventDraft, FieldPath } from './schema'

export type PresetId =
  | 'vrchatGroup'
  | 'vrchatCalendar'
  | 'vrchatEventCalendar'
  | 'wonderNote'
  | 'x'

export type CopyItem = {
  label: string
  value: string
  source?: FieldPath | 'generated'
  sources?: FieldPath[]
  required?: boolean
}

export type Warning = {
  presetId?: PresetId
  message: string
}

export type Preset = {
  id: PresetId
  name: string
  intent: string
  items: (draft: EventDraft) => CopyItem[]
  warnings: (draft: EventDraft) => Warning[]
}

export const fieldLabels: Record<FieldPath, string> = {
  title: 'イベント名',
  date: '開催日',
  startTime: '開催時刻',
  endTime: '終了時刻',
  timezone: 'タイムゾーン',
  organizerName: '主催者名',
  genre: 'ジャンル',
  platformSupport: '対応環境',
  participationMethod: '参加方法',
  groupId: 'VRChatグループID',
  groupUrl: 'VRChatグループURL',
  participationRequirements: '参加条件',
  notes: '注意事項',
  remarks: '備考',
  links: '関連リンク',
  summary: '短い概要',
  description: '詳細説明',
  tags: 'タグ',
  hashtags: 'ハッシュタグ',
  xPostText: 'X投稿文',
}

const xTemplateFields: Record<string, FieldPath> = {
  イベント名: 'title',
  開催日: 'date',
  開催時刻: 'startTime',
  終了時刻: 'endTime',
  主催者名: 'organizerName',
  VRChatグループURL: 'groupUrl',
}

export const xTemplateTokens = Object.keys(xTemplateFields).map((label) => `{${label}}`)

export const formatPlatformSupport = (values: string[]): string => {
  if (values.length === 0) return ''
  if (values.length === 1) return `${values[0]}限定`
  if (values.length === 2 && values.includes('PC VR') && values.includes('Desktop')) {
    return 'PCVR 限定(Desktop可)'
  }
  return `${values.join('、')}対応`
}

const required = (draft: EventDraft, paths: FieldPath[], presetId?: PresetId): Warning[] =>
  paths.flatMap((path) => {
    const value = draft[path]
    const empty = Array.isArray(value) ? value.length === 0 : String(value ?? '').trim() === ''
    return empty ? [{ presetId, message: `${fieldLabels[path]}は必須です。` }] : []
  })

const asText = (source: FieldPath, value: string | string[]): string => {
  if (source === 'platformSupport' && Array.isArray(value)) return formatPlatformSupport(value)
  if (Array.isArray(value)) return value.join('\n')
  return value
}

const item = (draft: EventDraft, label: string, source: FieldPath, requiredItem = false): CopyItem => ({
  label,
  source,
  sources: [source],
  required: requiredItem,
  value: asText(source, draft[source]),
})

const generatedItem = (label: string, value: string, sources: FieldPath[], requiredItem = false): CopyItem => ({
  label,
  value,
  sources,
  required: requiredItem,
  source: 'generated',
})

const appendGroupUrl = (text: string, groupUrl: string): string => [text.trim(), groupUrl.trim()].filter(Boolean).join('\n')

const prependGroupUrl = (text: string, groupUrl: string): string => [groupUrl.trim(), text.trim()].filter(Boolean).join('\n')

const durationHours = (draft: EventDraft): number | null => {
  if (!draft.date || !draft.startTime || !draft.endTime) return null
  const start = new Date(`${draft.date}T${draft.startTime}`)
  const end = new Date(`${draft.date}T${draft.endTime}`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const adjustedEnd = end.getTime() < start.getTime() ? end.getTime() + 24 * 60 * 60 * 1000 : end.getTime()
  return (adjustedEnd - start.getTime()) / 1000 / 60 / 60
}

const shortDate = (date: string): string => {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!match) return date
  return `${Number(match[1])}/${Number(match[2])}`
}

const xTemplateValue = (draft: EventDraft, source: FieldPath): string => {
  if (source === 'date') return shortDate(draft.date)
  const value = draft[source]
  return Array.isArray(value) ? value.join(' ') : value
}

const xTemplateSources = (template: string): FieldPath[] => {
  const sources = Object.entries(xTemplateFields).flatMap(([label, source]) =>
    template.includes(`{${label}}`) ? [source] : [],
  )
  return Array.from(new Set(sources))
}

const renderXTemplate = (draft: EventDraft): string =>
  Object.entries(xTemplateFields).reduce(
    (text, [label, source]) => text.replaceAll(`{${label}}`, xTemplateValue(draft, source)),
    draft.xPostText,
  )

const generatedXPost = (draft: EventDraft): string => {
  if (draft.xPostText.trim()) return renderXTemplate(draft).trim()
  return [
    draft.title,
    draft.date && draft.startTime ? `${shortDate(draft.date)} ${draft.startTime}` : '',
    draft.participationMethod,
    draft.hashtags.join(' '),
  ]
    .filter(Boolean)
    .join('\n')
}

const xPostSources = (draft: EventDraft): FieldPath[] => {
  if (draft.xPostText.trim()) {
    return Array.from(new Set<FieldPath>(['xPostText', ...xTemplateSources(draft.xPostText)]))
  }
  return ['title', 'date', 'startTime', 'participationMethod', 'hashtags']
}

const weightedXLength = (text: string): number => {
  const urlPattern = /https?:\/\/\S+/g
  let length = 0
  let lastIndex = 0
  for (const match of text.matchAll(urlPattern)) {
    length += [...text.slice(lastIndex, match.index)].length
    length += 23
    lastIndex = (match.index ?? 0) + match[0].length
  }
  length += [...text.slice(lastIndex)].length
  return length
}

export const presets: Preset[] = [
  {
    id: 'vrchatGroup',
    name: 'VRChat Group通知',
    intent: 'グループ通知画面へ順番に転記するための最小セット。',
    items: (draft) => [
      item(draft, 'タイトル', 'title', true),
      item(draft, '開催日', 'date', true),
      item(draft, '開始時刻', 'startTime', true),
      item(draft, '終了時刻', 'endTime', true),
      item(draft, 'タイムゾーン', 'timezone', true),
      item(draft, '参加方法', 'participationMethod', true),
      item(draft, 'VRChatグループID', 'groupId'),
      item(draft, 'VRChatグループURL', 'groupUrl'),
      item(draft, '短い概要', 'summary'),
      item(draft, '詳細説明', 'description'),
      item(draft, '関連リンク', 'links'),
    ],
    warnings: (draft) => required(draft, ['title', 'date', 'startTime', 'endTime', 'timezone', 'participationMethod'], 'vrchatGroup'),
  },
  {
    id: 'vrchatCalendar',
    name: 'VRChat カレンダー',
    intent: 'VRChatカレンダー登録向け。未確定仕様は推測で固定せず、config側に残す。',
    items: (draft) => [
      item(draft, 'イベント名', 'title', true),
      item(draft, '開催日', 'date', true),
      item(draft, '開始時刻', 'startTime', true),
      item(draft, '終了時刻', 'endTime', true),
      item(draft, 'タイムゾーン', 'timezone', true),
      item(draft, '主催者名', 'organizerName'),
      item(draft, 'ジャンル', 'genre'),
      item(draft, '対応環境', 'platformSupport'),
      item(draft, '短い概要', 'summary'),
      item(draft, 'タグ', 'tags'),
    ],
    warnings: (draft) => [
      ...required(draft, ['title', 'date', 'startTime', 'endTime', 'timezone', 'participationMethod'], 'vrchatCalendar'),
      ...(draft.title.length > 64 ? [{ presetId: 'vrchatCalendar' as const, message: 'VRChat Calendarのタイトルは64文字以内が目安です。' }] : []),
      ...(draft.tags.length > 5 ? [{ presetId: 'vrchatCalendar' as const, message: 'VRChat Calendarのタグは最大5件が目安です。' }] : []),
      // Future extension: languages max 3. Keep as config-level rule when the schema adds languages.
    ],
  },
  {
    id: 'vrchatEventCalendar',
    name: 'VRChat EventCalendar',
    intent: 'Googleフォーム転記用に項目順を固定した表示。',
    items: (draft) => [
      item(draft, 'イベント名', 'title', true),
      item(draft, '開催日', 'date', true),
      item(draft, '開始時刻（24時間表記）', 'startTime', true),
      item(draft, '終了時刻（24時間表記）', 'endTime', true),
      item(draft, '主催者名', 'organizerName'),
      item(draft, '詳細説明', 'description'),
      item(draft, 'ジャンル', 'genre'),
      item(draft, '対応環境', 'platformSupport'),
      item(draft, '参加条件', 'participationRequirements'),
      generatedItem('参加方法', appendGroupUrl(draft.participationMethod, draft.groupUrl), ['participationMethod', 'groupUrl'], true),
      item(draft, '備考', 'remarks'),
      {
        label: '投稿本文',
        source: draft.xPostText.trim() ? 'xPostText' : 'generated',
        sources: xPostSources(draft),
        required: true,
        value: generatedXPost(draft),
      }
    ],
    warnings: (draft) => {
      const hours = durationHours(draft)
      return [
        ...required(draft, ['title', 'date', 'startTime', 'endTime', 'timezone', 'participationMethod'], 'vrchatEventCalendar'),
        ...(hours !== null && hours > 6 ? [{ presetId: 'vrchatEventCalendar' as const, message: '開催時間が6時間を超えています。' }] : []),
      ]
    },
  },
  {
    id: 'wonderNote',
    name: 'Wonder Note',
    intent: 'Wonder Note掲載用の短め告知素材。',
    items: (draft) => [
      item(draft, 'タイトル', 'title', true),
      item(draft, '開催日', 'date', true),
      item(draft, '開始時刻', 'startTime', true),
      item(draft, '終了時刻', 'endTime'),
      item(draft, 'ジャンル', 'genre'),
      item(draft, '対応環境', 'platformSupport'),
      item(draft, '短い概要', 'summary', true),
      item(draft, '本文', 'description'),
      generatedItem('参加方法', prependGroupUrl(draft.participationMethod, draft.groupUrl), ['groupUrl', 'participationMethod'], true),
      item(draft, '注意事項','notes'),
      item(draft, 'タグ', 'tags'),
      item(draft, '関連リンク', 'links'),
      item(draft, 'group ID','groupId')
    ],
    warnings: (draft) => [
      ...required(draft, ['title', 'date', 'startTime', 'summary', 'participationMethod'], 'wonderNote'),
      ...(draft.title.length > 50 ? [{ presetId: 'wonderNote' as const, message: 'Wonder Noteのタイトルは50文字以内が目安です。' }] : []),
      ...(draft.summary.length > 140 ? [{ presetId: 'wonderNote' as const, message: 'Wonder Noteの概要は140文字以内が目安です。' }] : []),
      ...(draft.tags.length > 5 ? [{ presetId: 'wonderNote' as const, message: 'Wonder Noteのタグは最大5件が目安です。' }] : []),
    ],
  },
  {
    id: 'x',
    name: 'X(Twitter)',
    intent: `X投稿文を優先。${xTemplateTokens.join('、')} を参照できます。`,
    items: (draft) => [
      {
        label: '投稿本文',
        source: draft.xPostText.trim() ? 'xPostText' : 'generated',
        sources: xPostSources(draft),
        required: true,
        value: generatedXPost(draft),
      },
    ],
    warnings: (draft) => {
      const text = generatedXPost(draft)
      const length = weightedXLength(text)
      return [
        ...(text.trim() ? [] : [{ presetId: 'x' as const, message: '投稿本文が空です。X投稿文、またはイベント名/開催日/開始時刻/参加方法/ハッシュタグを入力してください。' }]),
        ...(length > 140 ? [{ presetId: 'x' as const, message: `X投稿文は日本語概算で約${length}文字です。URLは23文字換算です。` }] : []),
      ]
    },
  },
]
