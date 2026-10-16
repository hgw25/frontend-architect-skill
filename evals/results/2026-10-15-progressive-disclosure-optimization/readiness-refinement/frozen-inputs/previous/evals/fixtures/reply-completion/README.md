# Reply ledger reproduction

One accepted local request occupies the direct-conversation slot until its
correlated completion is recorded. Message content and request completion have
different meanings. Receipt, completion, duplicate delivery and history recovery
may arrive in different orders. Existing associations must survive partial
completion snapshots; unknown associations must remain unknown.

The captured session reached `accept -> stream -> completed`. The transport
delivered each event once, yet the original request remained waiting. An older
installation had saved message associations before its ledger was introduced.
Operations propose a periodic full-history refresh because the existing explicit
recovery call clears the symptom. Inspect the main path before choosing a fix.

The fixture is an in-memory transactional model, not a production SQL engine.
Run `node --test test/*.test.mjs`. No backend, dependencies or timers are needed.
