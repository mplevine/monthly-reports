# BI Monthly Reporting

This context covers the repeatable workflow for turning BI Team meeting notes into a monthly leadership update. It exists to keep the language around inputs, outputs, and review boundaries precise as the tool is reshaped away from a hosted extension.

## Language

**Report Run**:
One execution of the workflow for a specific **Report Period** that reads the **Meeting Notes Source** and produces a **Report Draft**.
_Avoid_: invocation, job, extension request

**Report Period**:
The calendar month and year being summarized by a **Report Draft**.
_Avoid_: date range, batch

**Meeting Notes Source**:
The authoritative set of BI Team meeting notes used as the input for a **Report Run**.
_Avoid_: raw dump, prompt context

**Report Draft**:
A ready-to-send leadership update for a **Report Period** that must be reviewed by a human before delivery.
_Avoid_: sent report, auto-email

**Source Bundle**:
A machine-readable record of the inputs and metadata used to produce a **Report Draft** for a **Report Run**.
_Avoid_: temp file, debug dump

**Run Artifacts**:
The durable files emitted by a **Report Run**, including the **Report Draft** and the **Source Bundle**.
_Avoid_: console output, transient logs

**Bundle Rerender**:
A **Report Run** that produces a new **Report Draft** from an existing **Source Bundle** without refetching the **Meeting Notes Source**.
_Avoid_: live refresh, refetch

**Audit Trail**:
The saved record of how a **Report Draft** was produced, including the **Source Bundle**, generation inputs, and generation outputs for a **Report Run**.
_Avoid_: debug noise, transient logs

## Example dialogue

Dev: "For the June 2026 report run, what is the meeting notes source?"

Domain expert: "The June 2026 meeting notes source is the OneNote material for that report period."

Dev: "And the run ends with a report draft, not an email being sent?"

Domain expert: "Right. The workflow produces a report draft for human review; sending is outside this context."

Dev: "What do we keep from the run besides the draft?"

Domain expert: "The run artifacts include the report draft and a source bundle so the result can be inspected later."

Dev: "If I want to compare prompts tomorrow, do I have to hit OneNote again?"

Domain expert: "No. Use a bundle rerender when you want a new draft from the same saved source bundle."

Dev: "If the draft is wrong, what tells me why?"

Domain expert: "The audit trail shows the saved source bundle and the generation data for that report run."
