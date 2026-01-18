# Chunking Strategy for LinkedIn Content (Posts, Articles, Comments) + Ingestion Formats

This document defines a chunking strategy for LinkedIn content used in a Retrieval-Augmented Generation (RAG) system, including how to handle common ingestion formats (raw text, HTML, CSV exports).

Primary goal: preserve semantic meaning, rhetorical context, and author intent while keeping retrieval precise, efficient, and robust.

---

## 1. Platform Limits (Known Constraints)

LinkedIn enforces hard character limits that directly inform chunking decisions:

- **Comment:** max **1,250 characters**
- **Post:** max **3,000 characters**
- **Article body:** max **110,000 characters**
- **Article headline:** max **100 characters**

### Why this matters
- Comments and most posts already fit comfortably within common embedding limits and should **not be over-chunked**.
- Articles exceed model context windows and require **structured, hierarchical chunking**.
- Chunking strategies should respect **author-imposed boundaries** whenever possible.

---

## 2. High-Level Chunking Principles

- Prefer **semantic and structural boundaries** over fixed token sizes.
- Avoid splitting content that represents a **single rhetorical unit** aka the smallest span of text that still accomplishes one communicative job without needing outside context; if one would say "wait, what are you referring to?" when reading it alone, it's not a complete rhetorical unit.
- Use **metadata and retrieval logic** to reassemble context rather than inflating chunks.
- Overlap is a **last resort**, not a default.

---

## 3. Input Formats and Preprocessing (Sanitizing Before Chunking)

Content may arrive as:
- plain text
- raw HTML (tags, inline styles, scripts, tracking)
- CSV exports (rows, columns, escaped newlines)

Chunking must only occur after converting each record into a canonical, clean text representation.

### 3.1 Canonical Record Shape

Normalize each unit into:

- content_type (comment | post | article)
- parent_type
- parent_id
- item_id
- author
- timestamp
- headline (articles only)
- body (main text only)
- thread_id / reply_to_comment_id (comments)
- hashtags / mentions
- source_url
- raw_source_format
- language

Only `headline` and `body` should be chunked. Everything else is metadata.

---

### 3.2 Preprocessing: HTML Input

Required steps:
1. Remove scripts, styles, tracking
2. Remove navigation/boilerplate
3. Preserve semantic structure (headings, lists, quotes)
4. Decode HTML entities
5. Normalize whitespace
6. Preserve meaningful links and alt text
7. Convert to markdown-like plain text

Never chunk raw HTML.

---

### 3.3 Preprocessing: CSV Input

Required steps:
1. Select correct text columns
2. Unescape and normalize newlines
3. Remove CSV artifacts
4. Normalize whitespace
5. Validate IDs and content lengths

Never chunk concatenated or malformed rows.

---

## 4. Chunking Strategy by Content Type

### 4.1 LinkedIn Comments (≤ 1,250 characters)

- Default: 1 comment = 1 chunk
- Overlap: none

Metadata:
- parent_id, thread_id, reply_to_comment_id
- author_is_op, timestamp, likes

Risk: comment retrieved without context  
Mitigation: always fetch parent content.

---

### 4.2 LinkedIn Posts (≤ 3,000 characters)

- Default: 1 post = 1 chunk
- Overlap: none
- Split only if author already structured content

If split:
- chunk by sections
- prepend hook (first 1–2 lines)

---

### 4.3 LinkedIn Articles (≤ 110,000 characters)

- Use structure-aware hierarchical chunking

Parent chunks:
- section-level
- ~800–1,500 tokens

Child chunks:
- paragraph groups
- ~250–500 tokens
- 1 paragraph overlap

Prepend breadcrumb:
<Article Headline> > <H2> > <H3>

Comments indexed separately and linked via parent_id.

---

## 5. Overlap Rules

- Comments: 0%
- Posts: 0%
- Articles: child chunks only (10–15%)

---

## 6. Most Robust Setup

Index:
1. Main content chunks
2. Comment chunks
3. Optional composites (post + top comments)

Retrieval:
- search all
- if comment matches, fetch parent
- prefer parent chunks for generation

---

## 7. Known Failure Modes

- Comment without context → fetch parent
- Over-chunked posts → default to full post
- HTML junk → sanitize before chunking
- CSV artifacts → normalize and validate

---

## 8. Summary

- Respect LinkedIn character limits
- Sanitize input formats before chunking
- Avoid over-chunking short-form content
- Use hierarchy and metadata to preserve context
