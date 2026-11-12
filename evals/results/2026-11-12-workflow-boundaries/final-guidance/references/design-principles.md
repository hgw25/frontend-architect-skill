# Design Principles Applied to Real Contracts

Use a relevant section when responsibility, extension, substitution, information
ownership or contract design is unsettled. These are published design principles,
not a required architecture or a scoring checklist. Apply them to actual callers
and likely changes, preserving the skill's proportionate engineering standard.

## Contents

- [Apply SOLID to the responsible boundary](#apply-solid-to-the-responsible-boundary)
- [Hide decisions that consumers should not know](#hide-decisions-that-consumers-should-not-know)
- [Make obligations explicit with Design by Contract](#make-obligations-explicit-with-design-by-contract)
- [Apply DRY and YAGNI to knowledge and capability](#apply-dry-and-yagni-to-knowledge-and-capability)
- [Limit collaborator knowledge](#limit-collaborator-knowledge)

## Apply SOLID to the responsible boundary

**SRP — Single Responsibility Principle.** Martin's
[original clarification](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html)
relates reasons for change to the people/business functions requesting it. Locate
rules and effects that change for different reasons; separate those responsibilities
behind useful contracts while keeping things that change together cohesive.
Trace one real change through the proposed owners. A class can have several
methods serving one responsibility; a one-method wrapper can still mix policy,
transport and presentation. Method count and file length do not establish SRP.

**OCP — Open/Closed Principle.** Martin's
[discussion of Meyer's principle](https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html)
describes extension through stable boundaries. Identify the expected variation,
stabilize what consumers need, and add an implementation/policy at that seam.
Use a callback, composition, provider or the host's extension point when it fits.
Check that the anticipated variation can be added without unrelated caller edits.
This is selective protection from a known kind of change, not a prohibition on
editing existing code or a mandate for a registry behind every conditional.

**LSP — Liskov Substitution Principle / behavioral subtyping.** The
[Liskov–Wing paper](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf) and
[Martin's exposition](https://www.cs.utexas.edu/~downing/papers/LSP-1996.pdf)
make substitutability behavioral. State the caller's accepted inputs, promised
outcomes, errors, effects and relevant state/history constraints. A replacement
must not demand stronger preconditions or weaken those guarantees. Exercise the
same consumer contract with each supported implementation. Matching TypeScript
signatures alone is insufficient: an adapter that throws for a promised operation
or adds a hidden initialization protocol may not be substitutable. Split the
contract or use delegation when implementations genuinely offer different behavior.

**ISP — Interface Segregation Principle.** Martin's
[original paper](https://www.cs.utexas.edu/~downing/papers/ISP-1996.pdf)
separates interfaces by client needs. Inspect which consumers use which operations;
expose cohesive capability/role contracts and let an implementation support several
where appropriate. Pass the capabilities an operation uses rather than the whole
application store or SDK. Verify that a consumer no longer depends on unrelated
operations. Do not replace one coherent interface with a disconnected interface
per method, or hide required atomic behavior behind separate caller-managed steps.

**DIP — Dependency Inversion Principle.** Use
[the existing dependency guidance](dependency-composition.md#distinguish-the-concepts)
to direct source dependencies toward the needed abstraction and compose concrete
adapters at the proper owner. DIP, IoC, DI and a DI container remain distinct.
Inspect actual imports and public types, not just constructor parameters.

SOLID principles constrain different properties and can interact. A proposed
extension that violates the consumer contract does not become acceptable because
it reduces edits. Resolve the actual tradeoff without forcing five new layers.

## Hide decisions that consumers should not know

Parnas's [original modular decomposition paper](https://ckrybus.com/static/papers/decomposing_systems_into_modules_1972.pdf)
organizes modules around hidden design decisions rather than merely consecutive
processing steps. Identify a volatile representation, algorithm, integration
detail or cohesive policy; give its owner a stable contract expressed in consumer
terms. Keep that knowledge inside the owner and complete the actual caller wiring.

Test the boundary with a concrete change: a wire-format change should normally
remain in its adapter, while a changed business rule can legitimately affect
several consumers. A useful interface hides knowledge, not only source lines.
Private fields, barrels and a directory tree do not by themselves hide the
decision. Use [module boundaries](module-boundaries.md#hide-complexity-not-just-code)
for application-scale placement rather than duplicating a new layering scheme.

## Make obligations explicit with Design by Contract

Eiffel's [Design by Contract guidance](https://www.eiffel.org/doc/solutions/Design_by_Contract_and_Assertions)
distinguishes caller preconditions, supplier postconditions and object invariants.
For a consequential operation, specify valid starting facts, promised outcomes,
and what must remain true after each public operation. Include meaningful failure
and effect semantics in the project's contract; a rejected write must not look
like successful empty data.

Encode constraints using existing types, parsers, transitions and focused checks.
Validate untrusted values at the actual boundary, then rely on the established
internal contract. Do not add repeated parsing or assertion frameworks throughout
trusted code. A static type or assertion alone does not prove the complete
behavioral contract. For replacements, preserve compatible obligations as in LSP;
for domain rejection, retain the existing recoverable result/error convention.

## Apply DRY and YAGNI to knowledge and capability

The authors' [Pragmatic Programmer guidance](https://pragprog.com/tips/)
states DRY in terms of authoritative knowledge. Find where one rule or definition
has competing representations; choose its owner and make affected paths consume
it. Generated consumers can share a maintained source without hand-merging their
output. Similar syntax representing different business knowledge need not be
combined. Use [AHA and wrong-abstraction recovery](implementation-patterns.md#modularity-and-reuse)
when a shared abstraction accumulates incompatible branches.

Fowler's [YAGNI explanation](https://martinfowler.com/bliki/Yagni.html)
distinguishes speculative capabilities from work that keeps code easy to change.
Defer an unused engine, option family or second implementation; still create a
small boundary when it improves today's clarity/caller use and an ordinary later
change. Check the proposed mechanism against a current consumer and a realistic
change. Neither YAGNI nor DRY requires waiting for a fixed duplication count.

## Limit collaborator knowledge

The original Demeter project's [object formulation](https://www2.ccs.neu.edu/research/demeter/demeter-method/LawOfDemeter/object-formulation.html)
limits which objects a method should talk to. For behavior-rich collaborators,
avoid making the caller traverse internal object graphs and then coordinate their
private policy. Offer the cohesive operation or supply the direct capability the
caller needs; verify that an internal relationship can change without spreading
knowledge to unrelated callers.

This is the Law of Demeter / least knowledge, not a ban on dots, fluent APIs or
reading a documented data record. Do not add renamed forwarding methods for every
property access. Respect the public representation where exposing data is the
intended contract; solve the actual knowledge leak, if one exists.
