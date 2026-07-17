# Workflow Definition

Version: 1.0

Status: Draft

---

# Overview

Workflow là đơn vị mô tả cách Platform giải quyết một bài toán.

Workflow không chứa business logic.

Workflow chỉ mô tả:

- các bước xử lý
- mối quan hệ giữa các bước
- điều kiện thực thi
- luồng dữ liệu

Workflow được Platform đọc và thực thi thông qua Workflow Engine.

---

# Philosophy

Workflow là dữ liệu.

Workflow không phải mã nguồn.

Platform không biết Workflow dùng để làm gì.

Platform chỉ biết:

Node

↓

Dependency

↓

Execution Order

↓

Context

↓

Output

---

# Workflow Structure

Một Workflow bao gồm:

Metadata

↓

Nodes

↓

Edges

↓

Variables

↓

Policies

↓

Triggers

↓

Outputs

---

# Workflow Metadata

Workflow có thể định nghĩa:

- Name
- Description
- Version
- Status
- Tags
- Category

---

# Nodes

Node là đơn vị nhỏ nhất của Workflow.

Mỗi Node đại diện cho một Agent.

Ví dụ

Trend Research

Reference Image

Style Analysis

Review

Generate Image

---

# Node Properties

Mỗi Node có thể định nghĩa:

- Agent
- Input
- Output
- Retry Policy
- Timeout
- Condition
- Configuration

Node không biết Node tiếp theo.

---

# Edges

Edge mô tả quan hệ giữa hai Node.

Ví dụ

A

↓

B

↓

C

Hoặc

A

↓

B

↓

D

↓

C

Workflow Engine quyết định khi nào Node được phép chạy.

---

# Dependency

Node chỉ được chạy khi toàn bộ Dependency đã hoàn thành.

Ví dụ

Research

↓

Image Search

Trend Analysis

↓

Design Brief

Design Brief chỉ chạy khi:

Image Search

và

Trend Analysis

đã hoàn thành.

---

# Context

Workflow sử dụng Shared Context.

Context tồn tại trong suốt Execution.

Agent không truyền dữ liệu trực tiếp cho nhau.

Agent chỉ:

Read Context

↓

Process

↓

Write Context

Ví dụ

topic

↓

research

↓

reference_images

↓

design_brief

↓

generated_images

↓

review

---

# Input Mapping

Node chỉ đọc dữ liệu cần thiết.

Ví dụ

Research Agent

đọc

topic

Image Generation Agent

đọc

design_brief

Review Agent

đọc

generated_images

Không Agent nào đọc toàn bộ Context.

---

# Output Mapping

Sau khi hoàn thành,

Agent chỉ ghi Output của mình.

Platform tự động cập nhật Context.

---

# Execution Order

Workflow không bắt buộc chạy tuần tự.

Workflow Engine sẽ xác định thứ tự thực thi dựa trên Dependency.

Ví dụ

Research

↓

Image Search

Trend Analysis

↓

Design Brief

Image Search

và

Trend Analysis

được phép chạy đồng thời.

---

# Parallel Execution

Nếu hai Node không phụ thuộc nhau,

Platform có thể chạy song song.

Ví dụ

Research

↓

Image Search

Trend Analysis

↓

Design Brief

---

# Conditional Branch

Workflow có thể định nghĩa điều kiện.

Ví dụ

Review Score

↓

>=90

↓

Publish

↓

<90

↓

Improve Design

---

# Retry Policy

Mỗi Node có thể định nghĩa:

Retry Count

Retry Interval

Backoff Strategy

Fallback Agent

---

# Timeout

Node có thể định nghĩa thời gian thực thi tối đa.

Nếu vượt quá thời gian:

Retry

↓

Fallback

↓

Stop

tùy Policy.

---

# Error Handling

Workflow hỗ trợ:

Retry

Skip

Fallback

Stop Workflow

Compensation

Tất cả đều được cấu hình.

---

# Human Approval

Workflow có thể tạm dừng.

Ví dụ

Generate Image

↓

Waiting Approval

↓

Approved

↓

Review

Hoặc

Rejected

↓

Generate Again

---

# Dynamic Agent Replacement

Workflow không phụ thuộc Agent cụ thể.

Ví dụ

Research Agent V1

↓

Research Agent V2

↓

External Research Agent

Workflow không thay đổi.

---

# Dynamic Workflow Modification

Workflow có thể:

- thêm Node
- xóa Node
- thay Agent
- đổi thứ tự
- thay Dependency
- thêm Branch

mà không thay đổi Platform.

---

# Versioning

Workflow hỗ trợ nhiều Version.

Execution luôn gắn với đúng Version đã chạy.

Điều này đảm bảo khả năng truy vết và tái hiện kết quả.

---

# Execution Snapshot

Mỗi Execution lưu lại Snapshot của:

Workflow

↓

Nodes

↓

Configuration

↓

Context

↓

Outputs

Execution không bị ảnh hưởng nếu Workflow được chỉnh sửa sau đó.

---

# Future Capabilities

Loop

For Each

Sub Workflow

Nested Workflow

Workflow Template

Workflow Marketplace

Checkpoint

Resume

Pause

Schedule

Webhook Trigger

API Trigger

Event Trigger

Distributed Workflow

Multi-Tenant Workflow

AI Workflow Optimization