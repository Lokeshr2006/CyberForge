name: Feature Request
description: Suggest a new feature or enhancement
title: "[FEATURE] "
labels: ["enhancement", "triage"]

body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting an enhancement! Please describe the feature you'd like to see.

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Clear description of what you want to add
      placeholder: "I want to add a feature that allows..."
    validations:
      required: true

  - type: textarea
    id: use_case
    attributes:
      label: Use Case
      description: Why would this feature be useful?
      placeholder: "This would help because..."
    validations:
      required: true

  - type: textarea
    id: benefits
    attributes:
      label: Expected Benefits
      description: What benefits would this bring?
      placeholder: |
        - Better user experience
        - Improved performance
        - Enhanced security
    validations:
      required: true

  - type: textarea
    id: implementation
    attributes:
      label: Possible Implementation
      description: Do you have ideas on how to implement this?
      placeholder: "We could use... or modify..."

  - type: dropdown
    id: component
    attributes:
      label: Component
      description: Where should this feature be added?
      options:
        - API (Backend)
        - Web (Frontend)
        - Database
        - Infrastructure/DevOps
        - Documentation
        - Other
    validations:
      required: true

  - type: dropdown
    id: priority
    attributes:
      label: Priority
      description: How important is this feature?
      options:
        - "Critical (Blocks users)"
        - "High (Frequently requested)"
        - "Medium (Nice to have)"
        - "Low (Polish)"
    validations:
      required: true

  - type: textarea
    id: related
    attributes:
      label: Related Issues
      description: Link any related issues (use #number)
      placeholder: "Related to #123"

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      options:
        - label: I have searched for existing feature requests
          required: true
        - label: This feature aligns with CyberForge's goals
          required: true
