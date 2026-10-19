import { type FormEvent, useRef, useState } from 'react'

import { type Profile, updateProfile } from './api'

type SaveStatus = 'pending' | 'succeeded' | 'failed'

export function ProfileForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [visibleName, setVisibleName] = useState(profile.displayName)
  const [saveError, setSaveError] = useState(false)
  const nextSaveId = useRef(0)
  const latestSaveId = useRef(0)
  const latestSaveStatus = useRef<SaveStatus | undefined>(undefined)
  const confirmed = useRef({ saveId: 0, profile })

  function latestSaveFailed() {
    return latestSaveStatus.current === 'failed'
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const saveId = ++nextSaveId.current
    const submittedName = displayName
    latestSaveId.current = saveId
    latestSaveStatus.current = 'pending'
    setSaveError(false)
    setVisibleName(submittedName)

    try {
      const savedProfile = await updateProfile(submittedName)
      if (saveId > confirmed.current.saveId) {
        confirmed.current = { saveId, profile: savedProfile }
      }

      if (saveId === latestSaveId.current) {
        latestSaveStatus.current = 'succeeded'
        setVisibleName(savedProfile.displayName)
      } else if (latestSaveFailed()) {
        setVisibleName(confirmed.current.profile.displayName)
      }
    } catch {
      if (saveId === latestSaveId.current) {
        latestSaveStatus.current = 'failed'
        setVisibleName(confirmed.current.profile.displayName)
        setSaveError(true)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p aria-label="Current profile name">{visibleName}</p>
      <label>
        Display name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>
      <button>Save</button>
      {saveError && <p role="alert">Save failed. Please retry.</p>}
    </form>
  )
}
