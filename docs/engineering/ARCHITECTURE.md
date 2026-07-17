# AI Workflow Platform Architecture

Version: 1.0

Status: Draft

---

# Overview

AI Workflow Platform được xây dựng theo mô hình Configuration-Driven.

Platform không chứa bất kỳ Workflow cố định nào.

Mọi Workflow đều được định nghĩa bằng dữ liệu và được thực thi bởi Workflow Engine.

Platform chỉ chịu trách nhiệm:

- quản lý Agent
- quản lý Workflow
- điều phối Workflow
- quản lý Context
- lưu Execution

Business logic nằm trong Agent.

Workflow chỉ mô tả cách các Agent được kết nối.

---

# Core Architecture

                         Platform

                             │

        ┌────────────────────┼────────────────────┐

        ▼                    ▼                    ▼

Workflow Registry      Agent Registry      Tool Registry

        │                    │                    │

        └──────────────┬─────┴────────────────────┘

                       ▼

               Workflow Engine

                       │

               Execution Engine

                       │

                Shared Context

                       │

              Execution History

---

# Architectural Principles

## Configuration Driven

Workflow không được viết trong source code.

Workflow chỉ là dữ liệu.

Platform chỉ đọc Workflow Definition và thực thi.

---

## Workflow First

Workflow là thành phần trung tâm.

Agent không biết mình thuộc Workflow nào.

Workflow chỉ mô tả:

- các bước
- quan hệ
- điều kiện

---

## Agent Independence

Agent là thành phần độc lập.

Agent không gọi Agent khác.

Agent không biết bước tiếp theo là gì.

Agent chỉ:

Input

↓

Process

↓

Output

---

## Loose Coupling

Workflow

↓

Agent

↓

Tool

là ba thành phần độc lập.

Có thể thay đổi từng thành phần mà không ảnh hưởng phần còn lại.

---

## Reusability

Một Agent có thể tham gia nhiều Workflow.

Ví dụ

Research Agent

↓

Fashion Workflow

Blog Workflow

Email Workflow

Knowledge Workflow

---

## Replaceability

Agent có thể được thay thế.

Ví dụ

Research Agent V1

↓

Research Agent V2

↓

External Research Agent

Workflow không thay đổi.

---

## Extensibility

Platform phải cho phép:

- thêm Workflow
- thêm Agent
- thêm Tool

mà không cần sửa kiến trúc.

---

# Core Components

## Workflow Registry

Quản lý toàn bộ Workflow.

Workflow chỉ chứa:

- metadata
- nodes
- edges

---

## Agent Registry

Quản lý toàn bộ Agent.

Mỗi Agent là một capability.

Ví dụ

Research

Image Search

Review

Translate

Generate Image

---

## Tool Registry

Quản lý toàn bộ Tool.

Agent không phụ thuộc Tool cụ thể.

Tool có thể được thay thế.

---

## Workflow Engine

Đọc Workflow Definition.

Xác định:

- node tiếp theo
- dependency
- execution order

Workflow Engine không xử lý business logic.

---

## Execution Engine

Điều phối quá trình chạy.

Bao gồm:

- start
- pause
- resume
- retry
- cancel

---

## Shared Context

Toàn bộ Agent dùng chung một Context.

Agent chỉ đọc phần dữ liệu cần thiết.

Agent chỉ ghi Output của mình.

---

## Execution History

Lưu lại:

- input
- output
- status
- duration

cho từng Agent.

---

# Dynamic Workflow

Workflow có thể:

Create

Update

Clone

Version

Enable

Disable

---

Workflow có thể:

thêm Agent

↓

xóa Agent

↓

thay Agent

↓

đổi thứ tự

↓

thay đổi quan hệ

↓

thêm nhánh song song

↓

thêm điều kiện

mà không thay đổi Platform.

---

# Workflow Example

Kids Fashion

Input

↓

Trend Research

↓

Reference Images

↓

Style Analysis

↓

Design Brief

↓

Image Generation

↓

Review

↓

Output

---

Ngày mai có thể thay thành

Input

↓

Trend Research

↓

Market Analysis

↓

Reference Images

↓

Review

↓

Image Generation

↓

Output

Platform không thay đổi.