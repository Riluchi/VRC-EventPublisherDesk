export type FieldType = 'text' | 'date' | 'time' | 'textarea' | 'list' | 'checklist'

export type PlatformSupport = 'PC VR' | 'Desktop' | 'Quest' | 'iOS'

export type EventDraft = {
  title: string
  date: string
  startTime: string
  endTime: string
  timezone: string
  organizerName: string
  genre: string[]
  platformSupport: PlatformSupport[]
  participationMethod: string
  groupId: string
  groupUrl: string
  participationRequirements: string
  notes: string
  remarks: string
  links: string[]
  summary: string
  description: string
  tags: string[]
  hashtags: string[]
  xPostText: string
}

export type FieldPath = keyof EventDraft

export type FieldDefinition = {
  path: FieldPath
  label: string
  type: FieldType
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  layout?: 'full' | 'half'
}

export type FieldGroup = {
  title: string
  fields: FieldDefinition[]
}

export const genreOptions = [
  { value: '雑談', label: '雑談' },
  { value: '音楽', label: '音楽' },
  { value: 'DJ', label: 'DJ' },
  { value: 'ライブ', label: 'ライブ' },
  { value: 'ゲーム', label: 'ゲーム' },
  { value: '交流会', label: '交流会' },
  { value: '初心者向け', label: '初心者向け' },
  { value: '学術・講座', label: '学術・講座' },
  { value: '展示・ワールド巡り', label: '展示・ワールド巡り' },
  { value: 'ロールプレイ', label: 'ロールプレイ' },
  { value: 'その他', label: 'その他' },
]

export const platformSupportOptions: { value: PlatformSupport; label: PlatformSupport }[] = [
  { value: 'PC VR', label: 'PC VR' },
  { value: 'Desktop', label: 'Desktop' },
  { value: 'Quest', label: 'Quest' },
  { value: 'iOS', label: 'iOS' },
]

export const defaultDraft: EventDraft = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  timezone: 'Asia/Tokyo',
  organizerName: '',
  genre: [],
  platformSupport: [],
  participationMethod: '',
  groupId: '',
  groupUrl: '',
  participationRequirements: '',
  notes: '',
  remarks: '',
  links: [],
  summary: '',
  description: '',
  tags: [],
  hashtags: [],
  xPostText: '',
}

export const fieldGroups: FieldGroup[] = [
  {
    title: 'イベント基本情報',
    fields: [
      { path: 'title', label: 'イベント名', type: 'text', required: true, layout: 'full' },
      { path: 'date', label: '開催日', type: 'date', required: true, layout: 'full' },
      { path: 'startTime', label: '開始時刻', type: 'time', required: true, layout: 'half' },
      { path: 'endTime', label: '終了時刻', type: 'time', required: true, layout: 'half' },
      { path: 'timezone', label: 'タイムゾーン', type: 'text', required: true, layout: 'full' },
      { path: 'organizerName', label: '主催者名', type: 'text', layout: 'full' },
      { path: 'genre', label: 'ジャンル', type: 'checklist', options: genreOptions, layout: 'full' },
      { path: 'platformSupport', label: '対応環境', type: 'checklist', options: platformSupportOptions, layout: 'full' },
    ],
  },
  {
    title: '参加情報',
    fields: [
      { path: 'participationMethod', label: '参加方法', type: 'textarea', required: true, layout: 'full' },
      {
        path: 'groupId',
        label: 'VRChatグループID',
        type: 'text',
        placeholder: '例）grp_00000000-0000-0000-0000-000000000000',
        layout: 'full',
      },
      { path: 'groupUrl', label: 'VRChatグループURL', type: 'text', layout: 'full' },
      { path: 'participationRequirements', label: '参加条件', type: 'textarea', layout: 'full' },
      { path: 'notes', label: '注意事項', type: 'textarea', layout: 'full' },
      { path: 'remarks', label: '備考', type: 'textarea', layout: 'full' },
      { path: 'links', label: '関連リンク', type: 'list', placeholder: 'カンマまたは改行で区切る', layout: 'full' },
    ],
  },
  {
    title: '告知テキスト',
    fields: [
      { path: 'summary', label: '短い概要', type: 'textarea', layout: 'full' },
      { path: 'description', label: '詳細説明', type: 'textarea', layout: 'full' },
      { path: 'tags', label: 'タグ', type: 'list', placeholder: 'カンマまたは改行で区切る', layout: 'full' },
      { path: 'hashtags', label: 'ハッシュタグ', type: 'list', placeholder: '#付き推奨。カンマまたは改行で区切る', layout: 'full' },
      { path: 'xPostText', label: 'X投稿文', type: 'textarea', layout: 'full' },
    ],
  },
]
