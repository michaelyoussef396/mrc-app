# Framer Form Field Mapping

The Framer marketing site's "Request Inspection" form posts to the
`receive-framer-lead` Edge Function. The Edge Function expects each form field
to arrive as its own top-level key in the submitted JSON (e.g.
`"email": "you@example.com"`). When two or more form inputs share the same
`name` attribute, Framer aggregates them into an array (e.g.
`"phone": ["0400…", "you@example.com", "Carlton", "3053"]`), which then forces
the function into regex-based smart-extraction as a fallback.

The function still recovers the data, but it relies on the customer's data
*looking* like an email / phone / postcode by pattern-matching, not on the
field's name. That works for clean inputs and breaks the moment a customer
types something ambiguous.

## What the recent payloads actually look like

From `webhook_submissions` rows 2026-04-20 through 2026-04-22:

```jsonc
{
  "Name": "<full name>",          // ✅ correctly named — single string
  "Email": "<a date string>",     // ❌ this input is labelled "Email" but
                                  //    actually holds the customer's
                                  //    preferred date (e.g. "2026-05-01")
  "phone": [                      // ❌ four inputs share the name "phone":
    "<phone number>",             //    [0] phone
    "<email address>",            //    [1] real email
    "<suburb>",                   //    [2] suburb
    "<postcode>"                  //    [3] postcode
  ],
  "Message": "<issue text>",      // ✅ correctly named — single string
  "subject": [                    // ❌ two inputs share the name "subject":
    "<time>",                     //    [0] preferred time
    "<street address>"            //    [1] street address
  ]
}
```

## What the payload should look like after the fix

Each form input gets its own unique `name` attribute. No more arrays.

```jsonc
{
  "full_name": "Jane Smith",
  "phone": "0400123456",
  "email": "jane@example.com",
  "street": "35 Wellington Street",
  "suburb": "Mernda",
  "postcode": "3754",
  "preferred_date": "2026-05-01",
  "preferred_time": "10:10",
  "issue_description": "Mould visible on the bathroom ceiling, started after the recent rain."
}
```

Every value lands directly in the Edge Function's `getField()` lookup on the
first try. No regex fallback. No fragility.

## The rename checklist for Framer

Open the Framer editor and find the contact form. For each input, set its
**Name** property (the value Framer uses as the JSON key when submitting). If
the input is currently named one of the values in the "Current Name" column,
rename it to the value in the "Set Name to" column.

| Form field (what the customer types) | Current Name in Framer | Set Name to | Notes |
|---|---|---|---|
| Customer's full name | `Name` | `full_name` | "Name" also works; either is fine. The point is it must be **one** input with this name. |
| Phone number | `phone` (likely shared with 3 other inputs) | `phone` | Make this the **only** input named `phone`. Remove the name `phone` from the email, suburb, and postcode inputs below. |
| Email address | the input is currently being collected as part of `phone[1]` | `email` | This is the most important rename. Currently the customer's real email is buried in the `phone` array. The input labelled "Email" is being mis-used to hold a date. |
| Preferred date of inspection | `Email` | `preferred_date` | The Framer input currently labelled "Email" is collecting dates. Rename it. |
| Preferred time of inspection | the input is currently being collected as part of `subject[0]` | `preferred_time` | Pull this out of the `subject` group and give it its own unique name. |
| Street address | the input is currently being collected as part of `subject[1]` | `street` | Pull this out of the `subject` group and give it its own unique name. |
| Suburb | the input is currently being collected as part of `phone[2]` | `suburb` | Remove the name `phone` from this input. |
| Postcode | the input is currently being collected as part of `phone[3]` | `postcode` | Remove the name `phone` from this input. Recently added — currently working through the smart-extraction fallback. |
| Issue description | `Message` | `Message` | Already correct — leave as is. (`message`, `description`, `notes`, `details` also work.) |

## How to verify after the rename

1. Save and publish the Framer form.
2. Submit one test enquiry from the live site (use real-looking but
   identifiable data, e.g. name "Framer Rename Test", a temporary email you
   control, your phone number).
3. In Supabase Studio (or by asking Claude Code to query), open the
   `webhook_submissions` table and find the most recent row.
4. Inspect the `raw_payload` JSON. It should look like the "should look like"
   block above — flat keys, no arrays, no values in the wrong field.
5. Open the corresponding lead in `/admin/leads`. Every field should be
   populated with the right value (postcode in the postcode column, email in
   the email column, etc.).
6. After the rename ships, the function logs (Supabase Studio → Edge
   Functions → `receive-framer-lead` → Logs) will stop emitting
   `[smart-extraction] fallback triggered: …` warnings. That's the signal
   the form is sending clean data.

## Why we keep the smart-extraction fallback

Even after the Framer rename, the Edge Function will still walk arrays,
content-detect emails / phones / postcodes / dates / times, and recover from
mis-labelled fields. We keep this code as defence-in-depth: if anyone
accidentally renames a field in Framer six months from now, the data still
lands in the right column.

The only behaviour change in the Edge Function is that **whenever a fallback
layer recovers a field, the function now emits a `console.warn` with the
fallback type and the recovered field name.** Those warnings show in the
Supabase function logs and surface any future Framer drift before it causes
a data issue.

## Owner and timing

- **Owner:** Michael (Framer editor access required).
- **Estimated effort:** 15–30 minutes in the Framer editor + one test
  submission to verify.
- **Blocking:** nothing. The current smart-extraction handles the existing
  payload shape. This rename is preventative — it eliminates a class of
  fragility, not a present-day failure.
