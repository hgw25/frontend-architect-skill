import { type FormEvent, useState } from 'react'

import { type Profile, updateProfile } from './api'

export function ProfileForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [visibleName, setVisibleName] = useState(profile.displayName)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setVisibleName(displayName)
    await updateProfile(displayName)
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
    </form>
  )
}
