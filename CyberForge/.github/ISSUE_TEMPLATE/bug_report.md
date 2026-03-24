name: Bug Report
description: Report a bug or issue
title: "[BUG] "
labels: ["bug", "triage"]

body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting a bug! Please provide as much detail as possible.

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Clear description of what went wrong
      placeholder: "What happened that wasn't expected?"
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Step-by-step instructions to reproduce the issue
      placeholder: |
        1. Go to...
        2. Click...
        3. See error
      value: |
        1. 
        2. 
        3. 
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What should happen instead?
      placeholder: "The page should load successfully"
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened?
      placeholder: "Error message: Connection refused"
    validations:
      required: true

  - type: dropdown
    id: component
    attributes:
      label: Component
      description: Which part of the system is affected?
      options:
        - API (Backend)
        - Web (Frontend)
        - Database
        - Docker/Infrastructure
        - Other
    validations:
      required: true

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How critical is this issue?
      options:
        - "Critical (System down)"
        - "High (Major feature broken)"
        - "Medium (Feature partially broken)"
        - "Low (Minor issue)"
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: Your system information
      value: |
        - OS: [e.g., macOS 14.2, Ubuntu 22.04, Windows 11]
        - Browser: [e.g., Chrome 120, Firefox 121, Safari 17]
        - Node.js: [e.g., 20.10.0]
        - Docker: [e.g., 24.0.0]
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Logs & Error Messages
      description: Paste relevant logs or error messages
      render: bash
      placeholder: "Paste logs here (no credentials!)"

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots
      description: If applicable, add screenshots or screen recordings
      placeholder: "Drag and drop images here"

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other context that might help?
      placeholder: "E.g., this worked in version 0.9.0"

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: I have searched for existing issues
          required: true
        - label: I have provided clear steps to reproduce
          required: true
        - label: I have not included any credentials or sensitive data
          required: true
