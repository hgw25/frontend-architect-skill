export type Profile = {
  id: string
  displayName: string
  version: number
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

  const body: unknown = await response.json()

  if (!isProfile(body)) {
    throw new Error('Profile update returned an invalid response')
  }

  return body
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.displayName === 'string' &&
    typeof candidate.version === 'number' &&
    Number.isFinite(candidate.version)
  )
}
