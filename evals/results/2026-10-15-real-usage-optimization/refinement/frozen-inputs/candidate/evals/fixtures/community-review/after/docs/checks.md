# Verification record

Command: node --test test/*.test.mjs
Structural entry checks, feed request ordering, ordinary publish retry,
valid-ID acquisition, directory loading, favorites and formatting are covered.

## Flow-state register

| Flow | State | Recorded evidence |
| --- | --- | --- |
| Community | loading | feed.pending.test.mjs |
| Community | error | feed.pending.test.mjs |
| Community | empty | feed.pending.test.mjs |
| Community | success | row screenshot with a published release and activity ID |
| Community | disabled | CreateForm submit disabled with an empty title |
| Community | retry | publish.test.mjs retries without changing the draft |

Browser screenshots and keyboard testing live in the host repository, which is
not included in this review snapshot. These entries describe existing evidence.
