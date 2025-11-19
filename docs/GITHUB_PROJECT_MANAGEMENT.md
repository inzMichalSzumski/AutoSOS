# 📋 GitHub Project Management

Guide on how to use GitHub Issues and Projects to manage the AutoSOS project.

---

## 🎯 GitHub Issues - Basics

### What Are Issues?
GitHub Issues are tasks, bugs, feature requests - similar to Work Items in Azure DevOps.

### How to Create an Issue?

#### Method 1: Through GitHub Interface
1. Go to https://github.com/YOUR_USERNAME/AutoSOS
2. Click the **Issues** tab
3. Click **New Issue**
4. Select template (Feature Request, Bug Report, Security Enhancement)
5. Fill out the form
6. Add Labels (e.g., `enhancement`, `security`, `high-priority`)
7. Optionally: Assignees (who's working), Milestone, Project
8. Click **Submit new issue**

#### Method 2: Through GitHub CLI
```bash
# Install GitHub CLI (if you don't have it)
# Windows: winget install GitHub.cli
# Mac: brew install gh

# Login
gh auth login

# Create issue
gh issue create --title "[SECURITY] Add rate limiting" --body "Task description" --label security,enhancement

# List issues
gh issue list

# Close issue
gh issue close 123
```

---

## 🏷️ Labels

Recommended labels for AutoSOS:

### Type
- `bug` 🐛 - Bug to fix
- `enhancement` ✨ - New functionality
- `security` 🔐 - Security
- `documentation` 📚 - Documentation
- `refactoring` ♻️ - Code refactoring

### Priority
- `priority: critical` 🚨 - Critical, immediately
- `priority: high` ⬆️ - High, in this sprint
- `priority: medium` ➡️ - Medium, in backlog
- `priority: low` ⬇️ - Low, nice to have

### Status
- `status: blocked` 🚫 - Blocked by something else
- `status: in progress` 🔄 - Work in progress
- `status: needs review` 👀 - Waiting for review
- `status: ready` ✅ - Ready to be taken

### Components
- `backend` - Backend (.NET)
- `frontend` - Frontend (React)
- `database` - Database
- `devops` - CI/CD, deployment
- `mobile` - Mobile application

### Other
- `good first issue` 👶 - Good for beginners
- `help wanted` 🆘 - Help needed
- `wontfix` - We won't fix this
- `duplicate` - Duplicate of another issue

---

## 🎯 Milestones

Milestones = Sprints or versions

### Examples:
- **v0.2 - Operator Panel** (target: 2025-12-01)
- **v0.3 - Real-time** (target: 2025-12-31)
- **v1.0 - Production** (target: 2026-03-01)

### How to Create a Milestone:
1. Issues → Milestones → New Milestone
2. Title: `v0.2 - Operator Panel`
3. Due date: `2025-12-01`
4. Description: List of main features
5. Create milestone

### Assign Issue to Milestone:
- In issue → Milestone → select from list

---

## 📊 GitHub Projects (Boards)

GitHub Projects = Azure DevOps Boards

### How to Create a Project:

1. **Projects** tab in repo
2. **New Project** → select template:
   - **Board** - Kanban (To Do, In Progress, Done)
   - **Table** - Table view
   - **Roadmap** - Timeline with dates
3. Name it: `AutoSOS - Sprint 1`
4. Add issues by dragging or clicking `+`

### Example Kanban Board:

```
📋 Backlog    |  🔄 In Progress  |  👀 Review  |  ✅ Done
--------------|------------------|-------------|----------
Issue #15     |  Issue #10       |  Issue #8   |  Issue #5
Issue #16     |  Issue #11       |             |  Issue #6
Issue #17     |                  |             |  Issue #7
```

### Automation:
- When PR is merged → automatically move issue to "Done"
- When issue is assigned → move to "In Progress"

---

## 🔍 Search and Filtering

### Example queries:

```bash
# All open security issues
is:issue is:open label:security

# High priority bugs
is:issue is:open label:bug label:"priority: high"

# Issues assigned to me
is:issue is:open assignee:@me

# Issues in milestone v0.2
is:issue milestone:"v0.2 - Operator Panel"

# Issues without assignee (free to take)
is:issue is:open no:assignee label:"good first issue"
```

---

## 📝 Issue Templates (Already Created)

In `.github/ISSUE_TEMPLATE/` you have:

1. **feature_request.md** - New functionality
2. **bug_report.md** - Bug report
3. **security_enhancement.md** - Security

### How to Use:
When you create a new issue, GitHub will show these templates to choose from.

---

## 🚀 Workflow with Issues

### Example workflow:

1. **Planning:**
   - Create issues for all tasks
   - Add labels and milestones
   - Prioritize (drag & drop in Project)

2. **Sprint:**
   - Select issues for sprint
   - Assign to yourself
   - Move to "In Progress" in Project

3. **Work:**
   ```bash
   # Create branch for issue #25
   git checkout -b feature/25-rate-limiting
   
   # Work...
   git commit -m "feat: Add rate limiting #25"
   
   # Push and create PR
   git push origin feature/25-rate-limiting
   gh pr create --title "Add rate limiting" --body "Closes #25"
   ```

4. **Code Review:**
   - PR is reviewed
   - Issue automatically in "Review"

5. **Merge:**
   - PR is merged → issue closed automatically (thanks to "Closes #25")
   - Issue in "Done"

---

## 🔗 Linking Issues with Commits/PRs

### In commit message:
```bash
git commit -m "feat: Add JWT authentication

Closes #10
Related to #11, #12"
```

### In PR description:
```markdown
Closes #10
Fixes #15
Related to #20
```

**Keywords** (will automatically close issue after merge):
- `Closes #123`
- `Fixes #123`
- `Resolves #123`

---

## 📱 GitHub Mobile App

Manage issues on phone:
- iOS: https://apps.apple.com/app/github/id1477376905
- Android: https://play.google.com/store/apps/details?id=com.github.android

---

## 🤖 Automation with GitHub Actions

You can automate issue management:

```yaml
# .github/workflows/issue-management.yml
name: Issue Management

on:
  issues:
    types: [opened]

jobs:
  auto-label:
    runs-on: ubuntu-latest
    steps:
      - name: Label security issues
        if: contains(github.event.issue.title, '[SECURITY]')
        run: gh issue edit ${{ github.event.issue.number }} --add-label security,high-priority
```

---

## 📊 Reporting

### Useful views:

1. **Burndown Chart** - in Projects → Insights
2. **Velocity** - how many issues you close per sprint
3. **Label distribution** - how many issues of each type

---

## 💡 Tips

1. **One issue = one task** - don't create mega-issues
2. **Good titles** - `[SECURITY] Add rate limiting` instead of "security"
3. **Descriptions with context** - why, not just what
4. **Update statuses** - move in Board regularly
5. **Close old issues** - if outdated, close with comment
6. **Reference in commits** - always `#123` in commit message

---

## 📚 More Information

- [GitHub Issues Docs](https://docs.github.com/en/issues)
- [GitHub Projects Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub CLI](https://cli.github.com/)

---

**Happy project managing!** 🚀
