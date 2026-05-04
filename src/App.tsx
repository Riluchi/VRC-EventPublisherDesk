import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { defaultDraft, fieldGroups, type EventDraft, type FieldDefinition, type FieldPath, type PlatformSupport } from './config/schema'
import { fieldLabels, formatPlatformSupport, presets, xTemplateTokens, type CopyItem, type Preset, type PresetId, type Warning } from './config/presets'

const storageKey = 'vrc-event-publisher-desk:draft:v1'

const isFieldPath = (value: string): value is FieldPath =>
  fieldGroups.some((group) => group.fields.some((field) => field.path === value))

const allFieldPaths = (): FieldPath[] => fieldGroups.flatMap((group) => group.fields.map((field) => field.path))

const splitItems = (value: string): string[] =>
  value
    .split(/[\n,、]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  if (typeof value === 'string') return splitItems(value)
  return []
}

const normalizePlatformSupport = (value: unknown): PlatformSupport[] => {
  const rawItems = normalizeStringArray(value)
  const mapped = rawItems.flatMap((item) => {
    if (item === 'VR') return ['PC VR']
    if (item === 'PC Only') return ['PC VR', 'Desktop']
    if (item === 'PC / Quest') return ['PC VR', 'Desktop', 'Quest']
    if (item === 'Quest対応') return ['Quest']
    if (item === 'VR推奨') return ['PC VR']
    if (item === 'デスクトップ可') return ['Desktop']
    if (item === '未確認') return []
    return [item]
  })
  return Array.from(new Set(mapped)).filter((item): item is PlatformSupport =>
    item === 'PC VR' || item === 'Desktop' || item === 'Quest' || item === 'iOS',
  )
}

const readDraftValue = (draft: EventDraft, path: FieldPath): string | string[] => draft[path]

const writeDraftValue = (draft: EventDraft, path: FieldPath, value: string | string[]): EventDraft => ({ ...draft, [path]: value })

const listText = (value: string | string[]): string => (Array.isArray(value) ? value.join(', ') : value)

const isEmpty = (value: string | string[]): boolean => Array.isArray(value) ? value.length === 0 : value.trim() === ''

const mergeDraft = (value: unknown): EventDraft => {
  if (!value || typeof value !== 'object') return defaultDraft
  const partial = value as Partial<EventDraft>
  return {
    title: typeof partial.title === 'string' ? partial.title : defaultDraft.title,
    date: typeof partial.date === 'string' ? partial.date : defaultDraft.date,
    startTime: typeof partial.startTime === 'string' ? partial.startTime : defaultDraft.startTime,
    endTime: typeof partial.endTime === 'string' ? partial.endTime : defaultDraft.endTime,
    timezone: typeof partial.timezone === 'string' ? partial.timezone : defaultDraft.timezone,
    organizerName: typeof partial.organizerName === 'string' ? partial.organizerName : defaultDraft.organizerName,
    genre: normalizeStringArray(partial.genre),
    platformSupport: normalizePlatformSupport(partial.platformSupport),
    participationMethod: typeof partial.participationMethod === 'string' ? partial.participationMethod : defaultDraft.participationMethod,
    groupId: typeof partial.groupId === 'string' ? partial.groupId : defaultDraft.groupId,
    groupUrl: typeof partial.groupUrl === 'string' ? partial.groupUrl : defaultDraft.groupUrl,
    participationRequirements: typeof partial.participationRequirements === 'string' ? partial.participationRequirements : defaultDraft.participationRequirements,
    notes: typeof partial.notes === 'string' ? partial.notes : defaultDraft.notes,
    remarks: typeof partial.remarks === 'string' ? partial.remarks : defaultDraft.remarks,
    links: normalizeStringArray(partial.links),
    summary: typeof partial.summary === 'string' ? partial.summary : defaultDraft.summary,
    description: typeof partial.description === 'string' ? partial.description : defaultDraft.description,
    tags: normalizeStringArray(partial.tags),
    hashtags: normalizeStringArray(partial.hashtags),
    xPostText: typeof partial.xPostText === 'string' ? partial.xPostText : defaultDraft.xPostText,
  }
}

const loadDraft = (): EventDraft => {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? mergeDraft(JSON.parse(raw)) : defaultDraft
  } catch {
    return defaultDraft
  }
}

const downloadJson = (draft: EventDraft) => {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vrc-event-${draft.date || 'draft'}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const allWarnings = (draft: EventDraft): Warning[] => presets.flatMap((preset) => preset.warnings(draft))

const blockedSources = (copyItem: CopyItem, reviewFields: Set<FieldPath>): FieldPath[] =>
  (copyItem.sources ?? (copyItem.source && copyItem.source !== 'generated' ? [copyItem.source] : [])).filter((source) => reviewFields.has(source))

export const App = () => {
  const [draft, setDraft] = useState<EventDraft>(() => loadDraft())
  const [presetId, setPresetId] = useState<PresetId>('vrchatGroup')
  const [copyState, setCopyState] = useState<string>('')
  const [copiedCardKey, setCopiedCardKey] = useState<string>('')
  const [importError, setImportError] = useState<string>('')
  const [reviewFields, setReviewFields] = useState<Set<FieldPath>>(() => new Set())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedPreset = useMemo<Preset>(() => presets.find((preset) => preset.id === presetId) ?? presets[0], [presetId])
  const presetItems = useMemo(() => selectedPreset.items(draft), [draft, selectedPreset])
  const warnings = useMemo(() => allWarnings(draft), [draft])
  const visibleWarnings = warnings.filter((warning) => !warning.presetId || warning.presetId === presetId)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(draft))
  }, [draft])

  const markReviewed = (path: FieldPath) => {
    setReviewFields((current) => {
      const next = new Set(current)
      next.delete(path)
      return next
    })
  }

  const updateField = (field: FieldDefinition, rawValue: string | string[]) => {
    const nextValue = field.type === 'list' && typeof rawValue === 'string' ? splitItems(rawValue) : rawValue
    setDraft((current) => writeDraftValue(current, field.path, nextValue))
    markReviewed(field.path)
  }

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setDraft(mergeDraft(JSON.parse(String(reader.result))))
        setReviewFields(new Set(allFieldPaths()))
        setImportError('')
      } catch {
        setImportError('JSONを読み込めませんでした。ファイル内容を確認してください。')
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const copyValue = async (copyItem: CopyItem, cardKey: string) => {
    await navigator.clipboard.writeText(copyItem.value)
    setCopyState(`${copyItem.label}をコピーしました`)
    setCopiedCardKey(cardKey)
    window.setTimeout(() => setCopyState(''), 1200)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">VRC Event Publisher Desk</p>
          <h1>イベント告知入力補助ツール</h1>
        </div>
        <div className="toolbar">
          <button type="button" onClick={() => downloadJson(draft)}>JSON書き出し</button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>JSON読み込み</button>
          <button type="button" onClick={() => setDraft(defaultDraft)}>クリア</button>
          <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={handleImport} />
        </div>
      </header>

      {importError && <p className="alert">{importError}</p>}

      {reviewFields.size > 0 && (
        <section className="review-summary">
          JSON読み込み後、未確認の項目が {reviewFields.size} 件あります。確認チェックを入れるか、項目を編集するとコピー可能になります。
        </section>
      )}

      <section className="layout">
        <form className="editor">
          {fieldGroups.map((group) => (
            <section className="section" key={group.title}>
              <h2>{group.title}</h2>
              <div className="field-grid">
                {group.fields.map((field) => {
                  const value = readDraftValue(draft, field.path)
                  const needsReview = reviewFields.has(field.path)
                  return (
                    <div className={fieldClassName(field, value, needsReview)} key={field.path}>
                      <div className="field-label-row">
                        <span>
                          {field.label}
                          {field.required && <strong>必須</strong>}
                        </span>
                        {needsReview && (
                          <label className="review-check">
                            <input type="checkbox" onChange={() => markReviewed(field.path)} />
                            確認済み
                          </label>
                        )}
                      </div>
                      {renderInput(field, value, updateField)}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </form>

        <aside className="preview">
          <section className="preset-panel">
            <label className="field">
              <span>プリセット</span>
              <select value={presetId} onChange={(event) => setPresetId(event.target.value as PresetId)}>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
            </label>
            <p>{selectedPreset.intent}</p>
          </section>

          {visibleWarnings.length > 0 && (
            <section className="warning-list">
              <h2>警告</h2>
              {visibleWarnings.map((warning) => (
                <p key={`${warning.presetId ?? 'common'}-${warning.message}`}>{warning.message}</p>
              ))}
            </section>
          )}

          <section className="copy-list">
            <div className="copy-heading">
              <h2>コピー用カード</h2>
              {copyState && <span>{copyState}</span>}
            </div>
            {presetItems.map((copyItem) => {
              const missing = copyItem.required && copyItem.value.trim() === ''
              const blocked = blockedSources(copyItem, reviewFields)
              const copyDisabled = !copyItem.value || blocked.length > 0
              const cardKey = `${selectedPreset.id}-${copyItem.label}-${copyItem.source ?? 'custom'}`
              const cardClasses = [
                'copy-card',
                missing || blocked.length > 0 ? 'missing' : '',
                copiedCardKey === cardKey ? 'copied' : '',
              ].filter(Boolean).join(' ')
              return (
                <article className={cardClasses} key={cardKey}>
                  <div>
                    <p className="copy-label">{copyItem.label}</p>
                    <pre>{copyItem.value || '（未入力）'}</pre>
                    {blocked.length > 0 && (
                      <p className="copy-blocked">
                        要確認: {blocked.map((source) => fieldLabels[source]).join('、')}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => copyValue(copyItem, cardKey)} disabled={copyDisabled}>
                    コピー
                  </button>
                </article>
              )
            })}
          </section>
        </aside>
      </section>
    </main>
  )
}

const renderInput = (
  field: FieldDefinition,
  value: string | string[],
  updateField: (field: FieldDefinition, rawValue: string | string[]) => void,
) => {
  if (field.type === 'checklist') {
    const selectedValues = Array.isArray(value) ? value : []
    return (
      <div className="choice-field">
        <div className="choice-grid">
          {field.options?.map((option) => (
            <label className="choice" key={option.value}>
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selectedValues, option.value]
                    : selectedValues.filter((item) => item !== option.value)
                  updateField(field, next)
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {field.path === 'platformSupport' && selectedValues.length > 0 && (
          <p className="assist-text">{formatPlatformSupport(selectedValues)}</p>
        )}
        {field.path === 'genre' && selectedValues.length > 0 && <ChipList items={selectedValues} />}
      </div>
    )
  }

  if (field.type === 'textarea' || field.type === 'list') {
    return (
      <>
        <textarea
          value={listText(value)}
          placeholder={field.placeholder}
          rows={field.type === 'list' ? 3 : 5}
          onChange={(event) => updateField(field, event.target.value)}
        />
        {field.path === 'xPostText' && (
          <p className="assist-text">
            参照可能: {xTemplateTokens.join('、')}
          </p>
        )}
        {field.type === 'list' && Array.isArray(value) && value.length > 0 && <ChipList items={value} />}
      </>
    )
  }

  return (
    <input
      type={isFieldPath(field.path) && field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
      value={String(value)}
      placeholder={field.placeholder}
      onChange={(event) => updateField(field, event.target.value)}
    />
  )
}

const ChipList = ({ items }: { items: string[] }) => (
  <div className="chips">
    {items.map((item) => (
      <span className="chip" key={item}>{item}</span>
    ))}
  </div>
)

const fieldClassName = (field: FieldDefinition, value: string | string[], needsReview: boolean): string => {
  const classes = ['field']
  if (field.layout === 'full' || field.type === 'textarea' || field.type === 'list' || field.type === 'checklist') classes.push('field-wide')
  if (field.layout === 'half') classes.push('field-half')
  if (field.required && isEmpty(value)) classes.push('field-required-missing')
  if (needsReview) classes.push('field-review-pending')
  return classes.join(' ')
}
