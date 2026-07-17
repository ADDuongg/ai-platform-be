# Data Model: Workflow Management

**Feature**: `003-workflow-management` | **Date**: 2026-07-14

## Workflow

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| code | varchar(64) | unique among active rows (`deleted_at IS NULL`) |
| name | varchar(120) | |
| description | text | nullable |
| category | varchar(64) | nullable |
| tags | jsonb | string[] |
| status | enum | draft \| published \| archived |
| current_version | int | nullable until first publish |
| created_by | uuid | nullable |
| timestamps + deleted_at | | BaseEntity |

## Workflow Version

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| workflow_id | uuid | FK CASCADE |
| version | int | unique per workflow |
| status | enum | draft \| published |
| definition_json | jsonb | nodes/edges/variables/policies |
| changelog | text | nullable |
| published_at | timestamptz | nullable |
| created_by | uuid | nullable |

**Constraints**: unique `(workflow_id, version)`; partial unique one draft per workflow.

## Assignability (later Execution)

`status === published` AND `deleted_at IS NULL`.
