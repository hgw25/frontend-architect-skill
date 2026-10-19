# Profile name editing

The existing React/TypeScript form saves a profile name through the existing PATCH API.
After Save, the new name is shown immediately while the request is pending. A failed
save restores the latest confirmed profile and presents the existing retryable error.
Users may edit and save again while earlier requests are pending. Earlier responses
must not replace the newest visible edit; an older accepted response remains the
confirmed fallback if the newer save fails. Draft editing is not itself a save.
The API returns a profile with string id/displayName and numeric version. Failed
HTTP responses and invalid successful bodies are failures, with an accessible error.
Keep the existing public form and API entry points. Run npm run check.
