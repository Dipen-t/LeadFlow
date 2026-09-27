# 15. Email Automation

## 15.1 Template system

Templates contain:

-   subject
-   body
-   supported placeholders

Example:

``` text
Subject:
Welcome {{clientName}}

Body:
Hello {{clientName}},
Your advisor is {{advisorName}}.
```

## 15.2 Template rendering

The backend should render placeholders from trusted server-side data.

The client should not be able to inject arbitrary template variables
that expose unauthorized information.

## 15.3 Pipeline trigger

``` text
Lead enters stage
       |
       v
Find configured template
       |
       v
Create email job
       |
       v
Email worker
       |
       v
Provider
```

Email sending should be asynchronous so that a provider outage does not
block the lead-stage update.

## 15.4 Provider failure

If email delivery fails:

-   preserve the lead stage change
-   retain the email job/error state
-   retry where appropriate
-   log the failure
-   avoid duplicating the business operation

------------------------------------------------------------------------

# 16. Task Automation

## 16.1 Configuration

A brokerage admin configures task templates per stage.

Example:

``` text
Stage: NEW

Task:
"Call within 2 hours"

Due:
2 hours after stage entry

Assigned:
Lead's assigned advisor
```

## 16.2 Trigger

``` text
Lead enters NEW
      |
      v
Load task templates
      |
      v
Create task instances
      |
      v
Advisor sees task
```

## 16.3 Overdue tasks

A task is overdue when:

``` text
now > dueAt
AND status != COMPLETED
```

The frontend must visually distinguish overdue tasks.

The server remains the source of truth.

------------------------------------------------------------------------
