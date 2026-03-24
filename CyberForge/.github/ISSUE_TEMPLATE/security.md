name: Security Vulnerability
description: Report a security vulnerability
title: "[SECURITY] "
labels: ["security", "critical"]

body:
  - type: markdown
    attributes:
      value: |
        **IMPORTANT**: Do NOT create a public issue for security vulnerabilities!
        
        **Please email us instead**: security@cyberforge.local
        
        Include:
        - Vulnerability description
        - Steps to reproduce
        - Potential impact
        - Suggested fix (optional)
        
        We take security seriously and will acknowledge your report within 24 hours.

  - type: textarea
    attributes:
      label: Why Security Issues Should Not Be Public
      value: |
        Security vulnerabilities can be exploited by attackers if disclosed publicly before a fix is released.
        
        Please report to: security@cyberforge.local
    disabled: true
