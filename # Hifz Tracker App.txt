# Hifz Tracker App

## 1. Project Overview

**Hifz Tracker** is a Quran memorization planning and progress-tracking app designed to help a person organize their daily Hifz, revision, and Quran recitation in a simple, structured, and visually calm way.

The core idea is:

> **Make Hifz easier to plan, easier to track, and easier to stay consistent with.**

Rather than simply recording how much Quran someone has memorized, the app is designed around the **daily Hifz routine** itself:

* What am I memorizing today?
* What old Hifz am I revising?
* What did I memorize recently?
* What Quran am I reading/revising through Musāfahah or Tilawah?
* How much am I actually doing each week?
* How is my consistency changing over time?
* Am I on track with my Hifz goal?

The app should feel like a **personal Hifz planner + tracker**, rather than an overwhelming Quran super-app.

---

# 2. Main Goal

The main purpose of the app is to give someone doing Hifz a clear system for managing the different parts of their Quran routine.

The app separates Hifz into four practical daily categories:

1. **New Hifz**
2. **Old Revision**
3. **Recent Revision**
4. **Tilawah / Musāfahah**

This distinction is important because memorizing new Quran is only one part of maintaining Hifz.

The app therefore encourages a balanced routine between:

**New memorization → Recent reinforcement → Older revision → General Quran recitation**

---

# 3. Target Users

The initial version is primarily designed for:

* Individual Hifz students
* People memorizing Quran independently
* Students who already have a teacher
* Hafiz/Hafizah maintaining their memorization
* Muslims who want a structured Quran routine

The longer-term vision can expand the system into a **teacher–student–parent platform**, particularly for Quran schools and Hifz programs.

### Potential future users

* Quran teachers
* Hifz schools
* Parents monitoring their children's progress
* Halaqah groups
* Madrasahs
* Islamic learning centres

However, the **individual student experience should remain the foundation**.

---

# 4. Design Philosophy

The app should feel:

* Calm
* Warm
* Minimal
* Spiritual
* Organized
* Encouraging
* Easy to understand
* Not overly gamified
* Not visually overwhelming

The visual identity is based around an:

> **Ivory Cream / warm neutral aesthetic**

The design should feel more like a beautiful Quran journal or personal planner than a typical productivity app.

---

# 5. Core Navigation

The main navigation currently consists of:

* **Home**
* **Hifz Plan**
* **My Tracker**

These are the three primary areas of the application.

---

# 6. Welcome Page

The app should have a simple welcome page introducing the purpose of the application.

The experience should immediately communicate that this is a tool for building a structured Quran memorization routine.

The welcome experience should not be complicated.

The goal is to get the user into the actual Hifz system quickly.

---

# 7. Intro / Onboarding

The intro should explain the basic idea of the app before the user begins.

The onboarding should help the user understand:

* What the four Hifz categories mean
* How the Hifz Plan works
* How daily targets are recorded
* How weekly and monthly progress is calculated
* How the tracker reflects consistency

The onboarding should remain short and simple.

---

# 8. Hifz Plan

The **Hifz Plan** is one of the most important parts of the application.

It allows the user to create a structured memorization/revision plan.

The plan is based on four categories:

### N — New Hifz

The Quran being newly memorized.

This represents the user's primary new memorization target.

---

### R1 — Old Hifz

Previously memorized Quran that needs long-term revision.

This is intended to help prevent older portions from being neglected as the user continues memorizing new material.

---

### R2 — Recent Hifz

Recently memorized Quran that needs reinforcement.

This bridges the gap between:

**new memorization → long-term Hifz**

The purpose is to make sure newly memorized pages are repeatedly reinforced before becoming part of the user's older revision.

---

### R3 — Musāfahah / Tilawah

General Quran recitation, including:

* Musāfahah
* Tilawah
* General Quran reading

This category allows the user to continue interacting with Quran beyond the exact pages being memorized or revised.

---

# 9. Daily Target System

The Daily Target section is one of the most important UI elements.

The intended format is:

## DAILY TARGET

**New Hifz:**
**Old Revision:**
**Recent Revision:**
**Tilawah / Musāfahah:**

The user enters the amount they intend to complete in each category.

The Daily Target should be clearly visible and easy to update.

The purpose is not simply to record what happened.

It should first establish:

> **What am I supposed to do today?**

Then the tracker can compare the plan with actual progress.

---

# 10. Hifz Plan → Daily Target Connection

An important implementation requirement is that the Daily Target displayed on the relevant screens must actually reflect the values entered in the Hifz Plan.

For example:

If the user sets:

* New Hifz: 2 pages
* Old Revision: 5 pages
* Recent Revision: 2 pages
* Tilawah/Musāfahah: 1 Juz

those values should automatically appear in the Daily Target section.

The Hifz Plan should therefore function as the source of the user's target settings.

---

# 11. Daily Tracking

The tracker records what the user actually completed.

The user should be able to record progress for:

### New Hifz

How much new Quran was memorized.

### Old Revision

How much older memorized Quran was revised.

### Recent Revision

How much recently memorized Quran was reinforced.

### Tilawah / Musāfahah

How much general Quran recitation was completed.

The system should make it easy to compare:

**Target vs Actual**

---

# 12. Weekly Reflections

The app should automatically turn daily activity into a weekly reflection.

The goal is to help the user see patterns instead of looking only at individual days.

A weekly reflection could show things such as:

* Total New Hifz
* Total Old Revision
* Total Recent Revision
* Total Tilawah/Musāfahah
* Number of days active
* Target completion
* Weekly consistency

The user should be able to look back and understand:

> "What did I actually accomplish this week?"

---

# 13. Monthly Reflections

The same principle extends to monthly progress.

The monthly reflection should summarize the user's Hifz activity over the month.

Potential information includes:

* Total new memorization
* Total revision
* Total recent revision
* Total Tilawah/Musāfahah
* Active days
* Monthly consistency
* Progress toward the larger Hifz goal

This gives the user a bigger-picture view.

---

# 14. Calculation System

One important decision made for the app is that calculations should use:

> **×6 rather than ×7**

for converting daily targets into weekly/monthly planning figures where appropriate.

This reflects the intended Hifz routine rather than assuming the user will successfully complete the target every single day of the week.

The system should therefore not blindly multiply every daily target by seven.

---

# 15. Local Data Storage

The current version is intended to work with **local saving**.

This means the user's information can persist on the device without requiring an account or complicated setup.

The current concept prioritizes:

* Simplicity
* Fast use
* Personal tracking
* Minimal setup

Cloud accounts and synchronization can be considered later if the app expands into a larger platform.

---

# 16. My Tracker

The **My Tracker** section is where the user should be able to see their actual Hifz journey.

It should answer questions like:

* How much have I memorized?
* How much have I revised?
* How consistent have I been?
* What have I accomplished recently?
* Am I improving?
* How far have I come?

The tracker should feel encouraging rather than judgmental.

---

# 17. Progress Visualization

Progress should be presented visually wherever possible.

Examples include:

* Progress bars
* Completion percentages
* Weekly summaries
* Monthly summaries
* Simple progress cards
* Hifz milestones
* Consistency indicators

The visuals should remain minimal and aligned with the ivory-cream aesthetic.

The goal is:

> **See progress without feeling overwhelmed by data.**

---

# 18. Hifz Completion / Goal Planning

A future development direction is allowing users to enter a larger Hifz goal and use their current pace to understand their progress toward completion.

For example:

* Current memorized amount
* Remaining amount
* Daily target
* Weekly target
* Estimated completion timeline

This should be presented as an estimate rather than a rigid deadline.

---

# 19. The Four-Part Hifz Structure

The conceptual heart of the app is:

```text
                 HIFZ JOURNEY
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   NEW HIFZ       REVISION       TILAWAH
       │              │              │
       │       ┌──────┴──────┐        │
       │       │             │        │
       │    OLD REVISION  RECENT      │
       │                   REVISION   │
       └──────────────┬───────────────┘
                      │
                DAILY ROUTINE
                      │
             WEEKLY REFLECTION
                      │
             MONTHLY REFLECTION
```

The system is designed around the idea that Hifz is not simply:

> "How many pages have I memorized?"

It is:

> "How am I maintaining, reinforcing, and continuing what I have memorized?"

---

# 20. User Experience Flow

A basic user journey should look like:

```text
WELCOME
   ↓
INTRO
   ↓
HIFZ PLAN
   ↓
SET DAILY TARGETS
   ↓
DAILY TRACKING
   ↓
SAVE PROGRESS
   ↓
WEEKLY REFLECTION
   ↓
MONTHLY REFLECTION
   ↓
MY TRACKER
```

The user should be able to move through this without needing extensive instructions.

---

# 21. Current Visual Direction

The app's visual identity is:

### Colour direction

* Ivory
* Warm cream
* Soft beige
* Warm sandstone
* Off-white
* Very subtle neutral accents

The overall feeling should be similar to:

**Ivory Cream + warm minimal Islamic stationery**

rather than bright green or heavily decorative Islamic design.

---

# 22. Typography

Typography should be:

* Clean
* Readable
* Slightly larger than the earliest versions
* Spacious
* Modern
* Easy to scan

The interface should prioritize readability over fitting large amounts of information onto one screen.

---

# 23. Important UI Principle

The app should avoid unnecessary columns.

In particular, the Daily Target should **not** become a complicated table with separate R1/R2/R3 columns.

Instead, the user should see the simple labels:

```text
New Hifz
Old Revision
Recent Revision
Tilawah / Musāfahah
```

This keeps the interface understandable.

---

# 24. What Makes the Concept Different

The app is intentionally not trying to become a giant Quran application containing every possible feature.

Its central focus is:

> **Hifz planning + daily accountability + revision structure + progress reflection.**

There are already Quran/Hifz products offering memorization tracking, revision tools, calculators, teacher modes, and progress visuals.

Therefore, the opportunity for this project is not simply:

> "Make another app that tracks Quran memorization."

Instead, the product should develop a distinct experience around **simple, structured Hifz planning**, particularly for users who want something less complicated.

---

# 25. Long-Term Product Vision

The longer-term idea is to potentially turn the personal tracker into a broader Quran learning platform.

### Student

The student can:

* Set Hifz targets
* Track daily work
* Record revision
* View progress
* Follow a personal plan

### Teacher

A future teacher account could:

* Add students
* Assign Hifz
* Assign revision
* View student progress
* Monitor consistency
* Review performance

### Parent

A future parent account could:

* View their child's progress
* See assigned targets
* Monitor consistency
* Stay connected with the teacher/student journey

This creates a potential:

**Student ↔ Teacher ↔ Parent**

ecosystem.

---

# 26. Possible Future Teacher Dashboard

A future teacher dashboard could include:

```text
TEACHER DASHBOARD

Students
│
├── Student 1
│   ├── New Hifz
│   ├── Recent Revision
│   ├── Old Revision
│   └── Weekly Progress
│
├── Student 2
│   ├── New Hifz
│   ├── Recent Revision
│   ├── Old Revision
│   └── Weekly Progress
│
└── Student 3
    ├── New Hifz
    ├── Recent Revision
    ├── Old Revision
    └── Weekly Progress
```

The teacher would be able to see progress without relying entirely on notebooks or scattered messages.

---

# 27. Potential Parent Dashboard

The future parent experience could be intentionally simple.

For example:

**Child's Hifz**

* Current progress
* Today's target
* Today's completion
* Weekly progress
* Recent activity
* Teacher assignments

The goal would be visibility without making parents micromanage the student's Hifz.

---

# 28. Potential Future Features

Possible future features include:

### Teacher–Student connection

Students can connect to their teacher.

### Parent accounts

Parents can follow their child's progress.

### Assignments

Teachers can assign:

* New Hifz
* Recent revision
* Old revision
* Tilawah

### Notifications

Gentle reminders for daily Hifz.

### Progress reports

Automatically generated weekly/monthly reports.

### Hifz milestones

Celebrate milestones such as:

* 1 Juz
* 5 Juz
* 10 Juz
* 15 Juz
* 20 Juz
* 30 Juz

### Revision history

Allow users to see when a particular portion was last revised.

### Multiple Hifz plans

Allow different schedules during:

* School
* Holidays
* Ramadan
* Exam periods

---

# 29. Product Philosophy

The app should not make Hifz feel like a productivity competition.

It should encourage consistency while recognizing that people's schedules change.

The tone should be:

**"Keep going."**

not:

**"You failed your target."**

The product should help users return to their Quran routine after missed days rather than making them feel guilty for falling behind.

---

# 30. Spiritual Philosophy

The technology is meant to support the act of memorizing Quran, not replace the spiritual side of it.

The app should therefore remain a tool.

The ultimate purpose remains:

* Connection with the Quran
* Consistency
* Revision
* Understanding
* Worship
* Seeking Allah's pleasure

The app should encourage structure without making Hifz feel purely numerical.

---

# 31. Current MVP

The simplest useful version of the app should contain:

### Pages

* Welcome
* Intro
* Home
* Hifz Plan
* My Tracker

### Core functionality

* Set Hifz plan
* Set daily targets
* Track daily progress
* Track New Hifz
* Track Old Revision
* Track Recent Revision
* Track Tilawah/Musāfahah
* Save data locally
* Calculate weekly progress
* Calculate monthly progress
* Display reflections
* Display overall progress

This is enough to establish the core product before adding complicated social or teacher functionality.

---

# 32. Technical Direction

The app should prioritize:

* Simple state management
* Reliable local persistence
* Responsive design
* Mobile-first layouts
* Clean reusable components
* Easy editing of targets
* Automatic calculations
* Consistent data between Hifz Plan and Tracker

A major technical requirement is that changing a user's Hifz Plan should automatically update the relevant Daily Target displays.

---

# 33. Data Model Concept

A simplified structure could look like:

```text
USER
│
├── Hifz Goal
│
├── Hifz Plan
│   ├── New Hifz Target
│   ├── Old Revision Target
│   ├── Recent Revision Target
│   └── Tilawah/Musāfahah Target
│
└── Daily Records
    ├── Date
    ├── New Hifz Completed
    ├── Old Revision Completed
    ├── Recent Revision Completed
    └── Tilawah/Musāfahah Completed
```

The system can then generate:

```text
Daily → Weekly → Monthly → Overall Progress
```

---

# 34. Success Criteria

The app succeeds if a user can open it and immediately understand:

1. **What I need to do today**
2. **What I actually completed**
3. **How much Quran I have memorized**
4. **How much I have revised**
5. **How consistent I have been**
6. **How I am progressing toward my larger goal**

If the user has to think too hard to understand the interface, the design needs to become simpler.

---

# 35. One-Sentence Product Definition

> **Hifz Tracker is a simple, warm, and structured Quran memorization planner that helps users organize New Hifz, Old Revision, Recent Revision, and Tilawah/Musāfahah while tracking their daily, weekly, monthly, and overall progress.**

---

# 36. Short App Description

> **A simple way to plan, track, and stay consistent with your Hifz journey. Set your daily targets, record your memorization and revision, and see your Quran progress grow over time.**

---

# 37. Core Identity

The app can ultimately be summarized by four words:

**Plan. Memorize. Revise. Reflect.**

Or:

**Your Hifz. Your Plan. Your Progress.**
