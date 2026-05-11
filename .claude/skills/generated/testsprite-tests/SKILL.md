---
name: testsprite-tests
description: "Skill for the Testsprite_tests area of mrc-app. 17 symbols across 12 files."
---

# Testsprite_tests

17 symbols | 12 files | Cohesion: 96%

## When to Use

- Working with code in `testsprite_tests/`
- Understanding how setup_authenticated_test, cleanup_test, run_test work
- Modifying testsprite_tests-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `testsprite_tests/auth_helper.py` | setup_authenticated_test, cleanup_test, ensure_storage_dir, login_and_save_state, get_authenticated_context (+1) |
| `testsprite_tests/TC016_Settings_Management_Persistence_and_Validation.py` | run_test |
| `testsprite_tests/TC015_Dashboard_Real_time_Pipeline_and_Revenue_Tracking_Updates.py` | run_test |
| `testsprite_tests/TC012_Automated_Email_Sending_for_All_8_Templates.py` | run_test |
| `testsprite_tests/TC011_Booking_Calendar_Travel_Time_Conflict_Prevention.py` | run_test |
| `testsprite_tests/TC010_Customer_Self_Service_Booking_Calendar___Multi_day_Job_Booking.py` | run_test |
| `testsprite_tests/TC009_PDF_Report_Approval_Workflow.py` | run_test |
| `testsprite_tests/TC008_PDF_Report_Generation_from_Dynamic_HTML_Templates.py` | run_test |
| `testsprite_tests/TC006_Inspection_Form_Photo_Upload_Handling.py` | run_test |
| `testsprite_tests/TC005_Offline_Capable_Inspection_Form___Auto_Save_Feature.py` | run_test |

## Entry Points

Start here when exploring this area:

- **`setup_authenticated_test`** (Function) — `testsprite_tests/auth_helper.py:122`
- **`cleanup_test`** (Function) — `testsprite_tests/auth_helper.py:142`
- **`run_test`** (Function) — `testsprite_tests/TC016_Settings_Management_Persistence_and_Validation.py:10`
- **`run_test`** (Function) — `testsprite_tests/TC015_Dashboard_Real_time_Pipeline_and_Revenue_Tracking_Updates.py:10`
- **`run_test`** (Function) — `testsprite_tests/TC012_Automated_Email_Sending_for_All_8_Templates.py:10`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `setup_authenticated_test` | Function | `testsprite_tests/auth_helper.py` | 122 |
| `cleanup_test` | Function | `testsprite_tests/auth_helper.py` | 142 |
| `run_test` | Function | `testsprite_tests/TC016_Settings_Management_Persistence_and_Validation.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC015_Dashboard_Real_time_Pipeline_and_Revenue_Tracking_Updates.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC012_Automated_Email_Sending_for_All_8_Templates.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC011_Booking_Calendar_Travel_Time_Conflict_Prevention.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC010_Customer_Self_Service_Booking_Calendar___Multi_day_Job_Booking.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC009_PDF_Report_Approval_Workflow.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC008_PDF_Report_Generation_from_Dynamic_HTML_Templates.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC006_Inspection_Form_Photo_Upload_Handling.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC005_Offline_Capable_Inspection_Form___Auto_Save_Feature.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC004_Pipeline_Drag_and_Drop_Stage_Change.py` | 10 |
| `run_test` | Function | `testsprite_tests/TC003_HiPages_Integration_Populates_Leads_into_Pipeline.py` | 10 |
| `ensure_storage_dir` | Function | `testsprite_tests/auth_helper.py` | 16 |
| `login_and_save_state` | Function | `testsprite_tests/auth_helper.py` | 21 |
| `get_authenticated_context` | Function | `testsprite_tests/auth_helper.py` | 65 |
| `create_authenticated_page` | Function | `testsprite_tests/auth_helper.py` | 105 |

## How to Explore

1. `gitnexus_context({name: "setup_authenticated_test"})` — see callers and callees
2. `gitnexus_query({query: "testsprite_tests"})` — find related execution flows
3. Read key files listed above for implementation details
