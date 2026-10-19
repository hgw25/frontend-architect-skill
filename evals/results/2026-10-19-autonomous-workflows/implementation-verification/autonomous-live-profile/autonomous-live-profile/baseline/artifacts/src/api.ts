export type Profile = {
  id: string
  displayName: string
  version: number
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const profile = value as Record<string, unknown>
  return (
    typeof profile.id === 'string' &&
    typeof profile.displayName === 'string' &&
    typeof profile.version === 'number'
  )
}

export async function updateProfile(displayName: string): Promise<Profile> {
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })

  if (!response.ok) {
    throw new Error(`Profile update failed with status ${response.status}`)
  }

  const profile: unknown = await response.json()
  if (!isProfile(profile)) {
    throw new Error('Profile update returned an invalid response')
  }

  return profile
}
