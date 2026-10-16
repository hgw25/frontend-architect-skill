import { type ReactNode, useId, useState } from 'react'
import { createPortal } from 'react-dom'

type DialogProps = {
  children: ReactNode
  description: string
  title: string
  triggerLabel: string
}

export function Dialog({ children, description, title, triggerLabel }: DialogProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      {open &&
        createPortal(
          <div className="overlay" onClick={() => setOpen(false)}>
            <section
              aria-describedby={descriptionId}
              aria-labelledby={titleId}
              className="dialog"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id={titleId}>{title}</h2>
              <p id={descriptionId}>{description}</p>
              {children}
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </section>
          </div>,
          document.body,
        )}
    </>
  )
}
