# 📋 Zarządzanie projektem w GitHub

Przewodnik jak używać GitHub Issues i Projects do zarządzania projektem AutoSOS.

---

## 🎯 GitHub Issues - Podstawy

### Czym są Issues?
GitHub Issues to zadania, bugi, feature requesty - podobne do Work Items w Azure DevOps.

### Jak utworzyć Issue?

#### Metoda 1: Przez interfejs GitHub
1. Wejdź na https://github.com/TWOJ_USERNAME/AutoSOS
2. Kliknij zakładkę **Issues**
3. Kliknij **New Issue**
4. Wybierz template (Feature Request, Bug Report, Security Enhancement)
5. Wypełnij formularz
6. Dodaj Labels (np. `enhancement`, `security`, `high-priority`)
7. Opcjonalnie: Assignees (kto pracuje), Milestone, Project
8. Kliknij **Submit new issue**

#### Metoda 2: Przez GitHub CLI
```bash
# Zainstaluj GitHub CLI (jeśli nie masz)
# Windows: winget install GitHub.cli
# Mac: brew install gh

# Zaloguj się
gh auth login

# Utwórz issue
gh issue create --title "[SECURITY] Dodać rate limiting" --body "Opis zadania" --label security,enhancement

# Lista issues
gh issue list

# Zamknij issue
gh issue close 123
```

---

## 🏷️ Labels (Etykiety)

Zalecane labels dla AutoSOS:

### Typ
- `bug` 🐛 - Błąd do naprawienia
- `enhancement` ✨ - Nowa funkcjonalność
- `security` 🔐 - Bezpieczeństwo
- `documentation` 📚 - Dokumentacja
- `refactoring` ♻️ - Refaktoryzacja kodu

### Priorytet
- `priority: critical` 🚨 - Krytyczne, natychmiast
- `priority: high` ⬆️ - Wysokie, w tym sprincie
- `priority: medium` ➡️ - Średnie, w backlogu
- `priority: low` ⬇️ - Niskie, nice to have

### Status
- `status: blocked` 🚫 - Zablokowane przez coś innego
- `status: in progress` 🔄 - W trakcie pracy
- `status: needs review` 👀 - Czeka na review
- `status: ready` ✅ - Gotowe do wzięcia

### Komponenty
- `backend` - Backend (.NET)
- `frontend` - Frontend (React)
- `database` - Baza danych
- `devops` - CI/CD, deployment
- `mobile` - Aplikacja mobilna

### Inne
- `good first issue` 👶 - Dobre dla początkujących
- `help wanted` 🆘 - Potrzebna pomoc
- `wontfix` - Nie będziemy tego robić
- `duplicate` - Duplikat innego issue

---

## 🎯 Milestones (Kamienie milowe)

Milestones = Sprints lub wersje

### Przykłady:
- **v0.2 - Panel Operatora** (cel: 2025-12-01)
- **v0.3 - Real-time** (cel: 2025-12-31)
- **v1.0 - Produkcja** (cel: 2026-03-01)

### Jak utworzyć Milestone:
1. Issues → Milestones → New Milestone
2. Tytuł: `v0.2 - Panel Operatora`
3. Due date: `2025-12-01`
4. Description: Lista głównych features
5. Create milestone

### Przypisanie Issue do Milestone:
- W issue → Milestone → wybierz z listy

---

## 📊 GitHub Projects (Boards)

GitHub Projects = Azure DevOps Boards

### Jak utworzyć Project:

1. Zakładka **Projects** w repo
2. **New Project** → wybierz template:
   - **Board** - Kanban (To Do, In Progress, Done)
   - **Table** - Widok tabelaryczny
   - **Roadmap** - Timeline z datami
3. Nazwij: `AutoSOS - Sprint 1`
4. Dodaj issues przeciągając lub klikając `+`

### Przykładowy Board Kanban:

```
📋 Backlog    |  🔄 In Progress  |  👀 Review  |  ✅ Done
--------------|------------------|-------------|----------
Issue #15     |  Issue #10       |  Issue #8   |  Issue #5
Issue #16     |  Issue #11       |             |  Issue #6
Issue #17     |                  |             |  Issue #7
```

### Automatyzacja:
- Gdy PR jest merged → automatycznie przesuń issue do "Done"
- Gdy issue jest assigned → przesuń do "In Progress"

---

## 🔍 Wyszukiwanie i Filtrowanie

### Przykłady zapytań:

```bash
# Wszystkie otwarte security issues
is:issue is:open label:security

# Bugi wysokiego priorytetu
is:issue is:open label:bug label:"priority: high"

# Issues przypisane do mnie
is:issue is:open assignee:@me

# Issues w milestone v0.2
is:issue milestone:"v0.2 - Panel Operatora"

# Issues bez assignee (wolne do wzięcia)
is:issue is:open no:assignee label:"good first issue"
```

---

## 📝 Templates Issues (już utworzone)

W `.github/ISSUE_TEMPLATE/` masz:

1. **feature_request.md** - Nowa funkcjonalność
2. **bug_report.md** - Zgłoszenie błędu
3. **security_enhancement.md** - Bezpieczeństwo

### Jak używać:
Gdy tworzysz nowy issue, GitHub pokaże te templates do wyboru.

---

## 🚀 Workflow z Issues

### Przykładowy przepływ pracy:

1. **Planowanie:**
   - Utwórz issues dla wszystkich zadań
   - Dodaj labels i milestones
   - Priorytetyzuj (drag & drop w Project)

2. **Sprint:**
   - Wybierz issues do sprintu
   - Assign do siebie
   - Przenieś do "In Progress" w Project

3. **Praca:**
   ```bash
   # Utwórz branch dla issue #25
   git checkout -b feature/25-rate-limiting
   
   # Pracuj...
   git commit -m "feat: Add rate limiting #25"
   
   # Push i utwórz PR
   git push origin feature/25-rate-limiting
   gh pr create --title "Add rate limiting" --body "Closes #25"
   ```

4. **Code Review:**
   - PR jest reviewed
   - Issue automatycznie w "Review"

5. **Merge:**
   - PR jest merged → issue zamknięty automatycznie (dzięki "Closes #25")
   - Issue w "Done"

---

## 🔗 Linkowanie Issues z Commitami/PRami

### W commit message:
```bash
git commit -m "feat: Add JWT authentication

Closes #10
Related to #11, #12"
```

### W PR description:
```markdown
Closes #10
Fixes #15
Related to #20
```

**Słowa kluczowe** (automatycznie zamkną issue po merge):
- `Closes #123`
- `Fixes #123`
- `Resolves #123`

---

## 📱 GitHub Mobile App

Zarządzaj issues na telefonie:
- iOS: https://apps.apple.com/app/github/id1477376905
- Android: https://play.google.com/store/apps/details?id=com.github.android

---

## 🤖 Automatyzacja z GitHub Actions

Możesz automatyzować zarządzanie issues:

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

## 📊 Raportowanie

### Przydatne widoki:

1. **Burndown Chart** - w Projects → Insights
2. **Velocity** - ile issues zamykacie w sprincie
3. **Label distribution** - ile issues każdego typu

---

## 💡 Porady

1. **Jeden issue = jedno zadanie** - nie rób mega-issues
2. **Dobre tytuły** - `[SECURITY] Add rate limiting` zamiast "security"
3. **Opisy z kontekstem** - dlaczego, nie tylko co
4. **Aktualizuj statusy** - przesuwaj w Board na bieżąco
5. **Zamykaj stare issues** - jeśli nieaktualne, zamknij z komentarzem
6. **Reference w commitach** - zawsze `#123` w commit message

---

## 📚 Więcej informacji

- [GitHub Issues Docs](https://docs.github.com/en/issues)
- [GitHub Projects Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub CLI](https://cli.github.com/)

---

**Happy project managing!** 🚀

