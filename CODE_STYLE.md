# Code Style Guidelines

## Language Requirements

### Comments
**All comments in code must be written in English.**

This applies to:
- Inline comments (`// comment`)
- Block comments (`/* comment */`)
- XML documentation comments (`/// <summary>`)
- TODO comments (`// TODO: ...`)

### Examples

✅ **Correct:**
```csharp
// List of equipment IDs that the operator possesses
List<Guid> EquipmentIds
```

❌ **Incorrect:**
```csharp
// Lista ID sprzętów które operator posiada
List<Guid> EquipmentIds
```

### Enforcement

- **Backend (C#)**: StyleCop.Analyzers is configured to encourage proper documentation. Code reviews should verify that all comments are in English.
- **Frontend (TypeScript)**: ESLint is configured with comment formatting rules. Code reviews should verify that all comments are in English.
- **EditorConfig**: Reminders are included in `.editorconfig` file.

### Why English?

- Consistency across the codebase
- Easier collaboration with international developers
- Better tooling support (IDEs, linters, etc.)
- Industry standard practice

