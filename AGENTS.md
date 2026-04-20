- ## Feedback loop and self-correction
  - All AI outputs must be validated against structured schemas before they are accepted by the system.
  - The main schemas include:
    - IssueCard
    - InvestigationRecord
    - ErrorEntry
    - ArchiveDocument
  - If schema validation fails, the system must not silently accept the result. It should:
    1. capture the validation error,
    2. keep the user's original input,
    3. ask the AI to regenerate only the invalid structured section.
  - Tool/MCP results must also be checked:
    - Git commands must have successful exit codes.
    - Required repository context must be readable.
    - Archive generation must confirm that both the error-table entry and markdown archive file were actually written to disk.
  - After closeout, the system performs read-back verification:
    - confirm archive file exists,
    - confirm error table entry exists,
    - confirm required fields are non-empty.
  - If verification fails, the system creates a repair task instead of marking the issue as fully archived.
  - The system should keep a lightweight runtime log of:
    - tool calls,
    - validation failures,
    - archive write failures,
    - retry attempts.
  - Retry policy:
    - allow limited automatic regeneration for formatting/structure errors,
    - escalate to manual review if repeated failures occur.

## Build and test
- Start with a minimal desktop shell and local storage only.
- First milestone:
  - select repository path,
  - create issue card from fragmented text,
  - save issue card locally,
  - close issue and generate archive markdown + error-table entry.
- Required checks for each milestone:
  - app can start,
  - repository path can be read,
  - issue card can be created and re-opened,
  - archive files can be written and read back,
  - schema validation passes for all generated structured outputs.

## Commit policy
- The agent must create one Git commit after completing each task.
- Do not start the next task before the current task has been committed.
- Each commit should correspond to a single clear task outcome and use a concise, descriptive commit message.