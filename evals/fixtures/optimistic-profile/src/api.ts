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

  return response.json() as Promise<Profile>
}
