import { type FormEvent, useReducer, useRef, useState } from 'react'

import { type Profile, updateProfile } from './api'

const SAVE_ERROR = 'Save failed. Please retry.'

type SaveState = {
  confirmed: Profile
  confirmedSubmissionId: number
  optimistic: { submissionId: number; displayName: string } | null
  error: string | null
}

type SaveAction =
  | { type: 'submitted'; submissionId: number; displayName: string }
  | { type: 'succeeded'; submissionId: number; profile: Profile }
  | { type: 'failed'; submissionId: number }

function saveReducer(state: SaveState, action: SaveAction): SaveState {
  switch (action.type) {
    case 'submitted':
      return {
        ...state,
        optimistic: {
          submissionId: action.submissionId,
          displayName: action.displayName,
        },
        error: null,
      }

    case 'succeeded': {
      const confirmsNewerSubmission =
        action.submissionId > state.confirmedSubmissionId
      const isCurrentSubmission =
        action.submissionId === state.optimistic?.submissionId

      return {
        confirmed: confirmsNewerSubmission
          ? action.profile
          : state.confirmed,
        confirmedSubmissionId: confirmsNewerSubmission
          ? action.submissionId
          : state.confirmedSubmissionId,
        optimistic: isCurrentSubmission ? null : state.optimistic,
        error: isCurrentSubmission ? null : state.error,
      }
    }

    case 'failed':
      if (action.submissionId !== state.optimistic?.submissionId) {
        return state
      }

      return {
        ...state,
        optimistic: null,
        error: SAVE_ERROR,
      }
  }
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [saveState, dispatch] = useReducer(saveReducer, {
    confirmed: profile,
    confirmedSubmissionId: 0,
    optimistic: null,
    error: null,
  })
  const nextSubmissionId = useRef(0)

  const visibleName =
    saveState.optimistic?.displayName ?? saveState.confirmed.displayName

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const submissionId = ++nextSubmissionId.current
    const submittedDisplayName = displayName

    dispatch({
      type: 'submitted',
      submissionId,
      displayName: submittedDisplayName,
    })

    try {
      const updatedProfile = await updateProfile(submittedDisplayName)
      dispatch({ type: 'succeeded', submissionId, profile: updatedProfile })
    } catch {
      dispatch({ type: 'failed', submissionId })
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
      {saveState.error ? <p role="alert">{saveState.error}</p> : null}
    </form>
  )
}
