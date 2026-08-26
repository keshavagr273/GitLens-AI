---
version: alpha
name: "Dark Editorial AI"
description: "DocSense is an AI-powered document search and Q&A tool with a dark, editorial-leaning design. The interface pairs a large serif display font (Fraunces) for hero headlines with a monospaced label system (JetBrains Mono) for technical step labels and badges, all set against a near-black (#0a0a0b) background. A warm amber (#e8a33d) serves as the sole CTA and brand accent color, creating high contrast against the dark surface. The design is flat. no shadows. with minimal border-radius tokens and a tight 8px-base spacing grid."
colors:
  border-subtle: "#e5e7eb"
  surface-base: "#0a0a0b"
  surface-card: "#141312"
  surface-code: "#1f2937"
  amber-accent: "#e8a33d"
  pure-black: "#000000"
  text-muted: "#a09f9c"
  text-primary: "#f5f3ee"
  text-subtle: "#4b5563"
typography:
  hero-display:
    fontFamily: "Fraunces"
    fontSize: "60px"
    fontWeight: "400"
    lineHeight: "60px"
  section-heading-large:
    fontFamily: "Fraunces"
    fontSize: "30px"
    fontWeight: "400"
    lineHeight: "41.25px"
  section-heading-medium:
    fontFamily: "Fraunces"
    fontSize: "24px"
    fontWeight: "400"
    lineHeight: "32px"
  card-heading:
    fontFamily: "Fraunces"
    fontSize: "20px"
    fontWeight: "400"
    lineHeight: "28px"
  heading-bold:
    fontFamily: "Fraunces"
    fontSize: "18px"
    fontWeight: "700"
    lineHeight: "28px"
    letterSpacing: "-0.45px"
  body-default:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "24px"
  body-small:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "22.75px"
  label-mono:
    fontFamily: "JetBrains Mono"
    fontSize: "10px"
    fontWeight: "400"
    lineHeight: "15px"
    letterSpacing: "1px"
  label-mono-semibold:
    fontFamily: "JetBrains Mono"
    fontSize: "12px"
    fontWeight: "600"
    lineHeight: "16px"
    letterSpacing: "0.6px"
  caption-mono:
    fontFamily: "JetBrains Mono"
    fontSize: "9px"
    fontWeight: "400"
    lineHeight: "13.5px"
rounded:
  radius-xs: "2px"
  radius-sm: "4px"
  radius-md: "6px"
  radius-lg: "8px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-12: "48px"
  space-16: "64px"
  space-20: "80px"
  space-26: "104px"
  space-32: "128px"
---

## Overview

DocSense is an AI-powered document search and Q&A tool with a dark, editorial-leaning design. The interface pairs a large serif display font (Fraunces) for hero headlines with a monospaced label system (JetBrains Mono) for technical step labels and badges, all set against a near-black (#0a0a0b) background. A warm amber (#e8a33d) serves as the sole CTA and brand accent color, creating high contrast against the dark surface. The design is flat. no shadows. with minimal border-radius tokens and a tight 8px-base spacing grid.

**Signature traits:**
- Dual typeface system: Pairs Fraunces and Inter across the type hierarchy.

## Colors

The palette uses 15 validated color tokens across 2 theme profiles. Semantic roles stay attached to observed usage so generation agents can choose accents without inventing new color meaning.

**Semantic naming:**
- **surface-background** maps to `surface-base`: Role "background" is grounded by usage context "Primary page and section background; covers ~44% of surface area".
- **content-text** maps to `text-primary`: Role "text" is grounded by usage context "Hero headline, body copy, and primary foreground text; ~99% area coverage".
- **action-text** maps to `text-muted`: Role "text" is grounded by usage context "Navigation links, secondary labels, and muted UI text".
- **border-primary** maps to `border-subtle`: Role "primary" is grounded by usage context "Hairline borders on badge outlines, dividers, and prose elements".

### Dark Theme

### Primary Brand
- **Border Subtle** (#e5e7eb): Hairline borders on badge outlines, dividers, and prose elements. Role: primary. {authored: rgb(229, 231, 235), space: rgb}

### Text Scale
- **Amber Accent** (#e8a33d): CTA button fill, badge text, icon strokes, and brand accent throughout. Role: text. {authored: rgb(232, 163, 61), space: rgb, alpha: 0.05}
- **Pure Black** (#000000): CTA button label text on amber background. Role: text. {authored: rgb(0, 0, 0), space: rgb}
- **Text Muted** (#a09f9c): Navigation links, secondary labels, and muted UI text. Role: text. {authored: rgb(160, 159, 156), space: rgb}
- **Text Primary** (#f5f3ee): Hero headline, body copy, and primary foreground text; ~99% area coverage. Role: text. {authored: rgb(245, 243, 238), space: rgb}
- **Text Subtle** (#4b5563): Prose lead and footer-level muted text. Role: text. {authored: rgb(75, 85, 99), space: rgb}

### Surface & Shadows
- **Surface Base** (#0a0a0b): Primary page and section background; covers ~44% of surface area. Role: background. {authored: rgb(10, 10, 11), space: rgb, alpha: 0.9}
- **Surface Card** (#141312): Step icon card backgrounds and secondary surface panels. Role: background. {authored: rgb(20, 19, 18), space: rgb}
- **Surface Code** (#1f2937): Code block / pre background. Role: background. {authored: rgb(31, 41, 55), space: rgb}

### Light Theme

### Primary Brand
- **Border Subtle** (#e5e7eb): Hairline dividers and prose borders. Role: primary. {authored: rgb(229, 231, 235), space: rgb}

### Text Scale
- **Amber Accent** (#e8a33d): CTA button, badge, and brand accent. Role: text. {authored: rgb(232, 163, 61), space: rgb, alpha: 0.05}
- **Text Muted** (#a09f9c): Navigation and secondary label text. Role: text. {authored: rgb(160, 159, 156), space: rgb}
- **Text Primary** (#f5f3ee): Primary foreground text on dark surface. Role: text. {authored: rgb(245, 243, 238), space: rgb}

### Surface & Shadows
- **Surface Base** (#0a0a0b): Page background — site appears dark-only; light theme shares same dark palette. Role: background. {authored: rgb(10, 10, 11), space: rgb, alpha: 0.9}
- **Surface Code** (#1f2937): Code block background. Role: background. {authored: rgb(31, 41, 55), space: rgb}

## Typography

Typography uses Fraunces, Inter, JetBrains Mono across extracted hierarchy roles. Keep hierarchy mapped to these token rows before adding decorative type styles.

Mixes Fraunces and Inter and JetBrains Mono for visual contrast. Weight range spans regular, bold, semi-bold. Sizes range from 9px to 60px.

### Font Roles
- **Headline Font**: Fraunces
- **Body Font**: Fraunces

### Type Scale Evidence
| Role | Font | Size | Weight | Line Height | Letter Spacing | Stack / Features | Notes |
|------|------|------|--------|-------------|----------------|------------------|-------|
| Primary hero headline — large serif display at 1:1 line-height ratio | Fraunces | 60px | 400 | 60px | normal | Fraunces, Instrument Serif, Georgia, serif | Extracted token |
| Section-level headings | Fraunces | 30px | 400 | 41.25px | normal | Fraunces, Instrument Serif, Georgia, serif | Extracted token |
| Sub-section headings | Fraunces | 24px | 400 | 32px | normal | Fraunces, Instrument Serif, Georgia, serif | Extracted token |
| Card and feature headings | Fraunces | 20px | 400 | 28px | normal | Fraunces, Instrument Serif, Georgia, serif | Extracted token |
| Bold sub-headings with tight tracking | Fraunces | 18px | 700 | 28px | -0.45px | Fraunces, Instrument Serif, Georgia, serif | Extracted token |
| Primary body copy and UI text — most frequent tuple (×71) | Inter | 16px | 400 | 24px | normal | Inter, system-ui, sans-serif | Extracted token |
| Secondary body and caption text | Inter | 14px | 400 | 22.75px | normal | Inter, system-ui, sans-serif | Extracted token |
| Step labels, badges, and technical UI labels with wide tracking | JetBrains Mono | 10px | 400 | 15px | 1px | JetBrains Mono, IBM Plex Mono, Courier New, monospace | Extracted token |
| Emphasized mono labels and CTA button text | JetBrains Mono | 12px | 600 | 16px | 0.6px | JetBrains Mono, IBM Plex Mono, Courier New, monospace | Extracted token |
| Smallest technical captions and sub-labels | JetBrains Mono | 9px | 400 | 13.5px | normal | JetBrains Mono, IBM Plex Mono, Courier New, monospace | Extracted token |

## Layout

Responsive system uses 1 breakpoint tier(s): desktop.

This system uses a 4px base grid with scale values 4, 8, 12, 16, 24, 32, 48, 64, 80, 104, 128.

### Responsive Strategy
- **desktop (Unknown)**: Expand layout density and horizontal composition for wide viewports.

### Spacing System
| Token | Value | Px | Notes |
|------|-------|----|-------|
| space-1 | 4px | 4 | Extracted spacing token |
| space-2 | 8px | 8 | Extracted spacing token |
| space-3 | 12px | 12 | Extracted spacing token |
| space-4 | 16px | 16 | Extracted spacing token |
| space-6 | 24px | 24 | Extracted spacing token |
| space-8 | 32px | 32 | Extracted spacing token |
| space-12 | 48px | 48 | Extracted spacing token |
| space-16 | 64px | 64 | Extracted spacing token |
| space-20 | 80px | 80 | Extracted spacing token |
| space-26 | 104px | 104 | Extracted spacing token |
| space-32 | 128px | 128 | Extracted spacing token |

## Elevation & Depth

Keep depth flat unless validated shadow or interaction evidence appears in the extraction payload. Do not invent shadows beyond this evidence boundary.

### Shadow Evidence
| Shadow Token | Layers | Details |
|--------------|--------|---------|
| n/a | 0 | No validated shadow payload |

### Interaction Signals
| Theme | Signal | Evidence |
|-------|--------|----------|
| Light | backdrop-filter | blur(12px) |
| Light | outline-color | rgb(245, 243, 238) ; rgb(232, 163, 61) ; rgb(160, 159, 156) |
| Light | outline-width | 3px |
| Light | outline-offset | 0px |
| Dark | backdrop-filter | blur(12px) |
| Dark | outline-color | rgb(245, 243, 238) ; rgb(232, 163, 61) ; rgb(160, 159, 156) |
| Dark | outline-width | 3px |
| Dark | outline-offset | 0px |

## Shapes

Shape language maps directly to rounded tokens. Keep component corners consistent with the role mapping below before introducing bespoke geometry.

### Radius Roles
| Token | Value | Px | Role Mapping |
|------|-------|----|--------------|
| radius-xs | 2px | 2 | Hairline corner |
| radius-sm | 4px | 4 | Subtle corner |
| radius-md | 6px | 6 | Subtle corner |
| radius-lg | 8px | 8 | Control corner |

### Geometry Evidence
| Radius Token | Shape | Units |
|--------------|-------|-------|
| radius-xs | 2px | px |
| radius-sm | 4px | px |
| radius-md | 6px | px |
| radius-lg | 8px | px |

## Components

(none detected)

## Do's and Don'ts

Guardrails protect Dual typeface system without adding unsupported visual claims.

| Do | Don't |
|----|---------|
| Do maintain consistent spacing using the base grid | Don't make unsupported claims about absent visual features |
| Do maintain WCAG AA contrast ratios (4.5:1 for normal text) | Don't mix rounded and sharp corners in the same view |
| Do use the primary color only for the single most important action per screen |  |
| Do verify evidence before writing new design-system guidance |  |

## Responsive Evidence

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Breakpoint 1 | Unknown | (width >= 1024px) |

## Agent Prompt Guide

### Example Component Prompts
- Create button component using validated primary color role and spacing tokens.
- Create card component with mapped radius role and evidence-backed elevation.
- Create form input component using inferred typography hierarchy and border roles.

### Iteration Guide
1. Start with extracted palette and typography roles only.
2. Map spacing and radius directly from token tables before visual polish.
3. Apply component patterns one section at a time and compare against source intent.
4. Keep elevation claims tied to explicit evidence in output.
5. Iterate with smallest diffs and re-check section hierarchy after each change.
