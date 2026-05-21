# Adherence rules

## Core rule
Validate the user's requested outcome, not only the code changes.

## Translate prompts into proof obligations
- "add" means confirm the feature exists and is reachable
- "fix" means confirm the broken behavior is no longer present
- "refactor" means confirm behavior is preserved and structure improved
- "wire up" means confirm integration points actually connect
- "support" means confirm the new path is handled, not just partially scaffolded

## What to prove
- requested behavior exists
- repo defaults were followed when relevant
- requested commands, routes, screens, workflows, or tests are present
- changed areas are covered by the most relevant validation method available

## What not to do
- do not equate lint passing with feature correctness
- do not assume generated tests are meaningful without inspecting their target
- do not claim runtime behavior from static review alone
- do not hide blocked validation behind vague language
