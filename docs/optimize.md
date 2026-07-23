# ADR-002: Research Pipeline & Token Optimization

**Status:** Accepted (MVP)

---

# 1. Background

AI Platform sử dụng workflow nhiều Agent.

```
Research
    ↓
Analysis
    ↓
Prompt Generator
    ↓
Image Generator
```

Research Agent chịu trách nhiệm thu thập dữ liệu từ Internet để phục vụ việc phân tích xu hướng.

Nguồn dữ liệu có thể bao gồm:

- SerpAPI (Google Search / Google Shopping)
- DuckDuckGo
- Google Search API
- Tavily
- Các Search Provider khác

---

# 2. Problem

Search Provider có thể trả về hàng trăm hoặc hàng nghìn kết quả.

Ví dụ:

```
Shopping Results

500 products

Articles

120

Social Posts

300
```

Nếu toàn bộ dữ liệu được truyền trực tiếp vào LLM:

```
Research

↓

80k Input Tokens
```

Đây là chi phí lớn nhất của toàn bộ workflow.

Nếu Analysis tiếp tục đọc lại toàn bộ dữ liệu:

```
Research

80k

↓

Analysis

80k
```

Chi phí token sẽ gần như nhân đôi.

---

# 3. Design Principles

## Search API Cost ≠ LLM Token Cost

Search Provider chỉ tính phí Search API.

Ví dụ:

```
SerpAPI

↓

JSON Response
```

Không phát sinh token LLM.

Token chỉ bắt đầu phát sinh khi dữ liệu được gửi vào GPT / Claude / Gemini.

Ví dụ:

```
SerpAPI

↓

500 Products JSON

↓

LLM
```

Lúc này mới phát sinh Input Tokens.

---

## Code handles structure

Backend chịu trách nhiệm xử lý cấu trúc dữ liệu.

Bao gồm:

- Normalize
- Projection
- Deduplicate
- Ranking
- Bucket Sampling

Không sử dụng AI.

---

## LLM handles semantics

Research Agent chỉ chịu trách nhiệm:

- đọc dữ liệu
- tìm trend
- phân tích màu sắc
- phân tích style
- phân tích material
- tạo Trend Finding

LLM không làm ETL.

---

# 4. Search Provider

Ví dụ sử dụng SerpAPI.

```
SerpAPI

↓

JSON
```

Ví dụ response:

```json
{
    "shopping_results": [
        {
            "title": "...",
            "price": "...",
            "rating": 4.8,
            "reviews": 521,
            "thumbnail": "...",
            "link": "..."
        }
    ]
}
```

Response được Backend Normalize về Domain Model.

Ví dụ:

```ts
interface Product {

    title: string;

    brand?: string;

    price?: number;

    rating?: number;

    reviewCount?: number;

    imageUrl?: string;

    sourceUrl?: string;
}
```

Research Agent không phụ thuộc vào SerpAPI schema.

---

# 5. Backend Preprocessing Pipeline

Trước khi gửi vào LLM.

Backend thực hiện:

```
Search Provider

↓

Normalize

↓

Projection

↓

Deduplicate

↓

Ranking

↓

Bucket Sampling

↓

Research Agent
```

---

# 6. Normalize

Chuyển Search Provider Response về Domain Model nội bộ.

Ví dụ:

```
SerpAPI JSON

↓

Product[]
```

Điều này giúp:

- không phụ thuộc Provider
- dễ thay Provider
- dễ test

---

# 7. Projection

Chỉ giữ các field cần thiết.

Ví dụ SerpAPI trả:

```json
{
    "title": "...",
    "thumbnail": "...",
    "delivery": "...",
    "extensions": "...",
    "shipping": "...",
    "seller": "...",
    "rating": "...",
    "reviews": "...",
    "price": "...",
    "currency": "...",
    "availability": "...",
    "link": "..."
}
```

Research Agent chỉ cần:

```
title

brand

price

rating

reviewCount

imageUrl

sourceUrl
```

Loại bỏ các field dư thừa giúp giảm đáng kể Input Tokens.

---

# 8. Deduplicate

Loại bỏ dữ liệu trùng.

Không deduplicate chỉ bằng title.

Ưu tiên:

- normalized URL
- product URL
- similarity đơn giản

Ví dụ:

```
Blue Tee

Blue T-Shirt

Blue Tee
```

↓

```
Blue Tee
```

---

# 9. Ranking

Không chỉ xếp theo Popularity.

Ví dụ:

Không nên:

```
rating DESC

reviews DESC
```

Điều này chỉ ưu tiên:

- Nike
- H&M
- Zara

Trong khi Trend mới có thể bị bỏ qua.

Ranking nên kết hợp nhiều tín hiệu.

Ví dụ:

```
Score

=

Relevance

+

Freshness

+

Popularity

+

Diversity
```

Ví dụ:

```
score =
0.35 * relevance
+
0.30 * freshness
+
0.20 * popularity
+
0.15 * diversity
```

---

# 10. Bucket Sampling

Không lấy Top 20 toàn bộ.

Thay vào đó lấy Top N theo từng nhóm.

Ví dụ:

```
Pastel

Top 5

Ocean

Top 5

Animal

Top 5

Space

Top 5
```

Ưu điểm:

- giữ Diversity
- tránh chỉ toàn Nike / Zara
- vẫn giữ Token thấp

---

# 11. Research Agent

Research Agent là Agent đầu tiên thực hiện suy luận.

Input:

```
Top Products

Articles

Social Posts
```

Output:

```ts
interface TrendFinding {

    summary: string;

    trends: Trend[];

    confidence: number;

    evidences: Evidence[];
}
```

Trend:

```ts
interface Trend {

    name: string;

    colors: string[];

    materials: string[];

    styles: string[];

    confidence: number;
}
```

Research Output phải nhỏ gọn.

Không trả lại toàn bộ Product JSON.

---

# 12. Analysis Agent

Analysis chỉ đọc Trend Finding.

Không đọc lại Search Result.

```
Research

↓

Trend Finding

↓

Analysis
```

Điều này giúp tránh việc nhiều Agent phải đọc lại cùng một lượng dữ liệu lớn.

---

# 13. Raw Search Artifact

Raw Search Result nên được lưu riêng.

Ví dụ:

```
execution_artifacts
```

Hoặc

```
S3

MinIO

Cloud Storage
```

Mục đích:

- Debug
- Audit
- Re-run Research
- Future Re-ranking

Không sử dụng làm Input trực tiếp cho Analysis trong MVP.

---

# 14. Token Budget

Mỗi Agent nên có giới hạn Token Budget riêng.

Ví dụ:

```
Research

Input

≤ 8k tokens

Output

≤ 2k tokens
```

```
Analysis

Input

≤ 3k tokens

Output

≤ 1k tokens
```

```
Prompt Generator

Input

≤ 2k tokens

Output

≤ 800 tokens
```

Điều này giúp:

- kiểm soát chi phí
- dễ monitor
- tránh prompt phình quá lớn

---

# 15. Agent Data Budget

Không hard-code Top 20.

Mỗi Agent tự khai báo nhu cầu dữ liệu.

Ví dụ:

```ts
interface AgentDefinition {

    maxInputItems: number;
}
```

Research:

```
30 Products
```

Analysis:

```
10 Trends
```

Prompt Generator:

```
5 Trend Signals
```

Backend tự cắt dữ liệu trước khi gửi vào LLM.

---

# 16. Final MVP Pipeline

```
Search Provider
        │
        ▼
Normalize
        │
        ▼
Projection
        │
        ▼
Deduplicate
        │
        ▼
Ranking
        │
        ▼
Bucket Sampling
        │
        ▼
Top N Items
        │
        ▼
Research Agent
        │
        ▼
Trend Finding
        │
        ▼
Analysis Agent
        │
        ▼
Prompt Generator
        │
        ▼
Image Generator
```

---

# 17. Future Improvements

Không nằm trong MVP.

Có thể bổ sung:

- Embedding
- Hugging Face NLP
- Semantic Clustering
- Vector Database
- Retrieval
- Artifact Query
- Multi-Source Ranking
- Knowledge Graph

---

# 18. Key Principles

- Search API Cost khác với LLM Token Cost.
- Backend xử lý cấu trúc dữ liệu.
- LLM xử lý ngữ nghĩa.
- Không đưa toàn bộ Search Result vào LLM.
- Chỉ gửi Top N dữ liệu đã được xử lý.
- Projection trước khi gửi vào LLM.
- Ranking không chỉ dựa trên Popularity.
- Ưu tiên Diversity và Freshness.
- Downstream Agent chỉ đọc Output của Upstream Agent.
- Raw Search Artifact lưu riêng để Debug và Audit.
- Mỗi Agent có Token Budget và Data Budget riêng.