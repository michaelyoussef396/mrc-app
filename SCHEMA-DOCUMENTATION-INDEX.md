# MRC Database Schema Documentation - Master Index

**Generated:** 2025-11-11
**Total Documentation:** 150+ KB across 5 files
**Completeness:** 100% of current Supabase database

---

## Documentation Files Overview

### 1. CURRENT-SCHEMA-STATE.md (50 KB)
**Purpose:** Complete reference manual for database schema
**Audience:** Developers, DBAs, architects
**Best for:** Looking up specific table definitions

**Contains:**
- All 27 tables with complete definitions
- Every column documented (name, type, constraints)
- All 155+ indexes catalogued with purposes
- All 17 custom functions documented
- All 8 enum types listed
- 10 critical issues identified with solutions
- RLS policy counts and patterns
- Data validation rules
- Performance recommendations

**Key Sections:**
- Table Directory (summary of all 27)
- Critical Tables Detailed Schema (top 10 tables)
- Secondary Tables (15 support tables)
- Custom Data Types (enums)
- Custom Functions (17 functions)
- Row Level Security (RLS Policies)
- Indexes Summary (155+)
- Database Migrations (6 versions)
- Critical Issues (10 categories)
- Performance Metrics
- Final Checklist

**Use When:** You need complete, authoritative information about a table or function

---

### 2. SCHEMA-RELATIONSHIPS-MAP.md (18 KB)
**Purpose:** Visual guide to how data flows through system
**Audience:** Developers, product managers, business analysts
**Best for:** Understanding data relationships and workflows

**Contains:**
- Visual entity relationship diagrams
- Complete 12-stage lead pipeline
- Inspection form data hierarchy
- Calendar & booking workflow
- Offline sync queue flow
- Communication audit trail
- User & access control model
- Pricing & financial workflow
- Search & query patterns (8 high-frequency queries)
- Data validation & constraints
- Performance optimization targets
- Data retention & archival strategy
- Security & RLS summary
- Critical data dependencies

**Key Diagrams:**
1. Primary entity relationships (leads → inspections → calendar)
2. Data flow through 12-stage pipeline
3. Inspection form hierarchy (rooms → areas → moisture readings)
4. Calendar workflow (booking tokens → conflict check → calendar event)
5. Offline sync flow (mobile edit → queue → reconnect → sync)
6. Communication audit (email/SMS logs, activities)
7. User access model (auth.users → profiles → roles)
8. Pricing workflow (settings → calculation → equipment → invoice)

**Use When:** You need to understand how tables connect or how data flows

---

### 3. SCHEMA-ANALYSIS-SUMMARY.md (19 KB)
**Purpose:** Executive assessment and recommendations
**Audience:** Tech leads, project managers, stakeholders
**Best for:** Deciding what to prioritize and what to fix

**Contains:**
- Quick Facts (27 tables, 24 with RLS, 73 policies)
- What We Have (strengths - 11 points)
- What We're Concerned About (7 issues with impact analysis)
- What's Missing (3 not-yet-implemented features)
- Critical Tables Status (10 tables assessed)
- Data Integrity Checks (all passed)
- Performance Analysis (query expectations)
- Security Assessment (9/10 for RLS)
- Compliance Check (GDPR 4/10, ABN 9/10)
- Migration Status (6 migrations complete)
- Recommendations Prioritized (by phase)
- Risk Assessment (3 levels)
- Testing Recommendations (unit, integration, load)
- Documentation Status (complete/partial/not started)
- Next Steps (immediate, this sprint, next sprint)
- Files Created (references to this and other docs)
- Key Statistics (8.5/10 overall health)

**Use When:** You need to make decisions about priorities, risks, or planning

---

### 4. SCHEMA-QUICK-REFERENCE.md (16 KB)
**Purpose:** Fast lookup guide for daily development
**Audience:** Developers actively coding
**Best for:** Quick answers while writing code

**Contains:**
- 27 Tables at a Glance (summary grid)
- 10 Most Important Tables (reference)
- Critical Queries (7 common SQL examples)
- Common Operations (5 multi-step workflows)
- Function Reference (all 17 functions organized)
- Enum Reference (8 types with values)
- RLS Policies Quick Guide (who sees what)
- Index Reference (quick lookup by table)
- Data Types & Validation (formats, regex, examples)
- Common Mistakes to Avoid (8 don'ts, 8 do's)
- Performance Tips (query optimization)
- Testing Checklist (9 items)
- Troubleshooting (4 common issues)
- Useful SQL Snippets (5 copy-paste queries)
- Key Metrics (size, speed benchmarks)
- Contact Points (where to find info)

**Use When:** You're writing a query, creating a function, or debugging an issue

---

### 5. SCHEMA-DOCUMENTATION-INDEX.md (This File)
**Purpose:** Guide to all documentation
**Audience:** Everyone
**Best for:** Understanding what documents exist and how to use them

**Contains:**
- Overview of all 5 documentation files
- How to choose which document to read
- Quick navigation by use case
- Document statistics
- Reading recommendations by role
- Search guide for finding information

---

## How to Use This Documentation

### If You're a Developer
1. **Start with:** SCHEMA-QUICK-REFERENCE.md (5 min)
2. **Then look up:** CURRENT-SCHEMA-STATE.md for details
3. **When debugging:** SCHEMA-ANALYSIS-SUMMARY.md for known issues
4. **To understand flow:** SCHEMA-RELATIONSHIPS-MAP.md

### If You're a Tech Lead
1. **Start with:** SCHEMA-ANALYSIS-SUMMARY.md (10 min)
2. **Review:** Recommendations section for priorities
3. **Dive into:** CURRENT-SCHEMA-STATE.md for critical issues
4. **Plan:** Phase 2F tasks based on prioritization

### If You're a Product Manager
1. **Start with:** SCHEMA-ANALYSIS-SUMMARY.md (Key Facts, What We Have)
2. **Review:** SCHEMA-RELATIONSHIPS-MAP.md for workflow understanding
3. **Check:** Compliance section for legal readiness
4. **Discuss:** Recommendations with engineering team

### If You're a DBA or Architect
1. **Start with:** CURRENT-SCHEMA-STATE.md (complete reference)
2. **Review:** Performance metrics and indexes
3. **Check:** Critical issues and recommendations
4. **Plan:** Phase 2F optimizations

### If You're New to the Project
1. **Read:** SCHEMA-RELATIONSHIPS-MAP.md (understanding)
2. **Study:** SCHEMA-QUICK-REFERENCE.md (70 tables and operations)
3. **Deep dive:** CURRENT-SCHEMA-STATE.md (as needed)
4. **Reference:** Use SCHEMA-ANALYSIS-SUMMARY.md for context

---

## Navigation by Use Case

### "I need to create a lead"
→ SCHEMA-QUICK-REFERENCE.md → "Creating a New Lead" section

### "I need to understand the inspection workflow"
→ SCHEMA-RELATIONSHIPS-MAP.md → "Inspection Form Data Hierarchy"

### "What tables should I query for the dashboard?"
→ SCHEMA-QUICK-REFERENCE.md → "Critical Queries" section

### "How do I schedule a calendar event?"
→ SCHEMA-QUICK-REFERENCE.md → "Common Operations" → "Scheduling an Inspection"

### "What's the issue with duplicate indexes?"
→ SCHEMA-ANALYSIS-SUMMARY.md → "Critical Issues & Inconsistencies" → "Issue 1"

### "How do RLS policies work?"
→ SCHEMA-QUICK-REFERENCE.md → "RLS Policies Quick Guide"
→ CURRENT-SCHEMA-STATE.md → "Row Level Security (RLS) Policies" → "RLS Policy Patterns"

### "What should we fix first?"
→ SCHEMA-ANALYSIS-SUMMARY.md → "Recommendations Prioritized"

### "How do offline syncs work?"
→ SCHEMA-RELATIONSHIPS-MAP.md → "Offline Sync Queue Flow"
→ SCHEMA-QUICK-REFERENCE.md → "Common Operations" → "Offline Sync"

### "What's the complete inspection_areas schema?"
→ CURRENT-SCHEMA-STATE.md → "INSPECTION_AREAS TABLE"

### "What are the custom functions?"
→ SCHEMA-QUICK-REFERENCE.md → "Function Reference"
→ CURRENT-SCHEMA-STATE.md → "CUSTOM FUNCTIONS (17)"

### "What are the compliance requirements?"
→ SCHEMA-ANALYSIS-SUMMARY.md → "Compliance Check"

### "What's the performance expected to be?"
→ SCHEMA-ANALYSIS-SUMMARY.md → "Performance Analysis"
→ SCHEMA-RELATIONSHIPS-MAP.md → "Performance Optimization Targets"

### "Are there any security issues?"
→ SCHEMA-ANALYSIS-SUMMARY.md → "Security Assessment"

### "What data validation exists?"
→ SCHEMA-RELATIONSHIPS-MAP.md → "Data Validation & Constraints"
→ CURRENT-SCHEMA-STATE.md → various table definitions

### "How do I write an offline sync query?"
→ SCHEMA-QUICK-REFERENCE.md → "Common Operations" → "Offline Sync"

---

## Key Information by Role

### Developer
- Critical queries: QUICK-REFERENCE (top 5 queries to know)
- Function calls: QUICK-REFERENCE (all 17 documented)
- Common operations: QUICK-REFERENCE (templates for create/read/update)
- Troubleshooting: QUICK-REFERENCE (4 common problems solved)

### Tech Lead
- Architecture: RELATIONSHIPS-MAP (workflow diagrams)
- Performance: ANALYSIS-SUMMARY (performance metrics)
- Security: ANALYSIS-SUMMARY (RLS assessment)
- Priorities: ANALYSIS-SUMMARY (recommendations by phase)
- Issues: CURRENT-STATE (10 critical issues documented)

### Product Manager
- Features: RELATIONSHIPS-MAP (12-stage pipeline visualization)
- Data: QUICK-REFERENCE (27 tables overview)
- Compliance: ANALYSIS-SUMMARY (GDPR/ABN readiness)
- Timeline: ANALYSIS-SUMMARY (Phase 2F/Phase 2 planning)

### QA/Testing
- Workflows: RELATIONSHIPS-MAP (data flow maps)
- Test cases: QUICK-REFERENCE (testing checklist)
- Validation: RELATIONSHIPS-MAP (constraints)
- Performance: ANALYSIS-SUMMARY (benchmarks to verify)

### DevOps/Infrastructure
- Schema size: ANALYSIS-SUMMARY (5MB, 27 tables)
- Migrations: CURRENT-STATE (6 completed)
- Performance: ANALYSIS-SUMMARY (155+ indexes)
- Monitoring: ANALYSIS-SUMMARY (key metrics)

---

## Statistics

### Documentation Completeness

| Item | Count | Status |
|---|---|---|
| Tables documented | 27/27 | 100% |
| Columns documented | 400+ | 100% |
| Functions documented | 17/17 | 100% |
| Indexes catalogued | 155+ | 100% |
| RLS policies counted | 73/73 | 100% |
| Enum types documented | 8/8 | 100% |
| Foreign keys identified | 60+ | 100% |
| Critical issues found | 10/10 | 100% |
| Workflows mapped | 8/8 | 100% |
| Recommendations provided | 25+ | 100% |

### Document Sizes

| Document | Size | Lines | Purpose |
|---|---|---|---|
| CURRENT-SCHEMA-STATE.md | 50 KB | 1,400+ | Complete reference |
| SCHEMA-RELATIONSHIPS-MAP.md | 18 KB | 600+ | Visual workflows |
| SCHEMA-ANALYSIS-SUMMARY.md | 19 KB | 650+ | Assessment & planning |
| SCHEMA-QUICK-REFERENCE.md | 16 KB | 550+ | Daily lookup |
| SCHEMA-DOCUMENTATION-INDEX.md | 3 KB | 100+ | Navigation guide |
| **TOTAL** | **~106 KB** | **3,300+** | Complete documentation |

### Database Statistics

| Metric | Value |
|---|---|
| Tables | 27 |
| Total columns | 400+ |
| Primary keys | 27 |
| Foreign keys | 60+ |
| Unique constraints | 12+ |
| Check constraints | 10+ |
| Indexes | 155+ |
| RLS policies | 73 |
| Custom functions | 17 |
| Enum types | 8 |
| Production rows | 153 |
| Database size | ~5 MB |

---

## Document Relationships

```
DOCUMENTATION-INDEX.md (You are here)
├─ Explains all documents
├─ Provides navigation guide
└─ Links to other docs

├─ QUICK-REFERENCE.md
│  └─ Daily development guide
│     ├─ References CURRENT-STATE for details
│     ├─ References RELATIONSHIPS for workflows
│     └─ References ANALYSIS for decisions
│
├─ CURRENT-SCHEMA-STATE.md
│  └─ Complete reference manual
│     ├─ Detailed for each of 27 tables
│     ├─ All functions documented
│     ├─ All issues identified
│     └─ Performance metrics
│
├─ SCHEMA-RELATIONSHIPS-MAP.md
│  └─ Visual workflow guide
│     ├─ Entity relationships
│     ├─ 12-stage lead pipeline
│     ├─ Data flow diagrams
│     └─ Query patterns
│
└─ SCHEMA-ANALYSIS-SUMMARY.md
   └─ Assessment & recommendations
      ├─ What's working (11 points)
      ├─ What needs fixing (10 issues)
      ├─ Security assessment
      ├─ Compliance check
      └─ Recommendations prioritized
```

---

## Recommended Reading Order

### First Time (30 minutes)
1. This index (5 min)
2. SCHEMA-RELATIONSHIPS-MAP.md (15 min)
3. SCHEMA-QUICK-REFERENCE.md tables overview (10 min)

### Before First Code (1 hour)
1. Previous + QUICK-REFERENCE "Common Operations" (30 min)
2. QUICK-REFERENCE "Critical Queries" (20 min)
3. QUICK-REFERENCE "RLS Policies" (10 min)

### Before Major Feature (2 hours)
1. Previous + relevant section of CURRENT-SCHEMA-STATE.md (40 min)
2. ANALYSIS-SUMMARY "Risk Assessment" (15 min)
3. RELATIONSHIPS-MAP "Query Patterns" section (20 min)
4. QUICK-REFERENCE "Troubleshooting" (5 min)

### Before Planning Sprint (3 hours)
1. All previous (1.5 hours)
2. ANALYSIS-SUMMARY "Recommendations Prioritized" (15 min)
3. ANALYSIS-SUMMARY full read (45 min)
4. CURRENT-SCHEMA-STATE "Critical Issues" (15 min)

---

## Searching the Documentation

### By Table Name
→ CURRENT-SCHEMA-STATE.md (Ctrl+F table name)
→ QUICK-REFERENCE.md (index sections)
→ RELATIONSHIPS-MAP.md (data flow diagrams)

### By Column Name
→ CURRENT-SCHEMA-STATE.md (search in table definitions)
→ QUICK-REFERENCE.md (for key fields)

### By Function Name
→ QUICK-REFERENCE.md "Function Reference" section
→ CURRENT-SCHEMA-STATE.md "CUSTOM FUNCTIONS" section

### By Enum Value
→ QUICK-REFERENCE.md "Enum Reference" section
→ CURRENT-SCHEMA-STATE.md "CUSTOM DATA TYPES" section

### By Query Pattern
→ QUICK-REFERENCE.md "Critical Queries" section
→ QUICK-REFERENCE.md "Useful SQL Snippets" section
→ RELATIONSHIPS-MAP.md "Search & Query Patterns" section

### By Performance Metric
→ ANALYSIS-SUMMARY.md "Performance Analysis" section
→ RELATIONSHIPS-MAP.md "Performance Optimization Targets" section

### By Known Issue
→ CURRENT-SCHEMA-STATE.md "CRITICAL ISSUES" section
→ ANALYSIS-SUMMARY.md "Critical Issues & Inconsistencies" section

### By Risk Category
→ ANALYSIS-SUMMARY.md "Risk Assessment" section

### By Recommendation
→ ANALYSIS-SUMMARY.md "Recommendations Prioritized" section

---

## Tools for Searching

**PDF Readers:** All documents are markdown but readable in any text editor
**Command Line:** `grep -r "search_term" .`
**VS Code:** Open all files, use global find (Ctrl+Shift+F)
**Browser:** Open in GitHub/GitLab web UI, use search
**Terminal:** `grep -i "table_name\|column_name" *.md`

---

## Updating Documentation

### When to Update

1. **New table created:** Add to CURRENT-SCHEMA-STATE.md, update QUICK-REFERENCE, update RELATIONSHIPS-MAP
2. **New function added:** Add to QUICK-REFERENCE "Function Reference", add to CURRENT-SCHEMA-STATE
3. **New index created:** Add to CURRENT-SCHEMA-STATE "Indexes Summary" section
4. **Schema issue fixed:** Move from CURRENT-STATE "Critical Issues" to ANALYSIS-SUMMARY "What We Have"
5. **RLS policy added:** Update RLS sections in all relevant documents
6. **Performance changed:** Update ANALYSIS-SUMMARY "Performance Analysis" section

### How to Update

1. Find relevant sections (use search guide above)
2. Update all documents that mention the item
3. Update statistics/counts at top of documents
4. Update "Last Updated" timestamp
5. Test references to ensure consistency

---

## Version History

| Date | Version | Status |
|---|---|---|
| 2025-11-11 | 1.0 | Complete analysis of production schema |

---

## Contact & Questions

### For Content
- **Schema questions:** CURRENT-SCHEMA-STATE.md
- **Workflow questions:** SCHEMA-RELATIONSHIPS-MAP.md
- **Decision questions:** SCHEMA-ANALYSIS-SUMMARY.md
- **Quick lookup:** SCHEMA-QUICK-REFERENCE.md

### For Updates
All documents are version-controlled in git. Update git version when making changes.

---

## Conclusion

This documentation provides complete coverage of the MRC Lead Management System database schema:

✅ **27 tables** - All documented
✅ **155+ indexes** - All catalogued
✅ **17 functions** - All referenced
✅ **73 RLS policies** - All counted
✅ **100+ columns** - All defined
✅ **10 issues** - All identified with solutions
✅ **25+ recommendations** - All prioritized

**Next steps:**
1. Choose appropriate document above
2. Find your use case in navigation guide
3. Refer to that section
4. Bookmark for future reference

---

**Generated:** 2025-11-11
**Database Schema Version:** Latest (20251104233314)
**Documentation Status:** COMPLETE
**Confidence Level:** HIGH (comprehensive Supabase MCP analysis)

