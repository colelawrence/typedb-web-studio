/**
 * Dense-Core Token Tests (Phase 1)
 *
 * Verifies that all Dense-Core design tokens are properly defined
 * in src/styles.css and accessible via CSS custom properties.
 */

import { describe, it, expect, beforeAll } from 'vitest'

describe('Dense-Core Tokens', () => {
  let rootStyles: CSSStyleDeclaration

  beforeAll(() => {
    // Get computed styles from document root
    rootStyles = getComputedStyle(document.documentElement)
  })

  describe('Spacing Tokens (Task 1.1)', () => {
    const spacingTokens = [
      ['--spacing-0', '0px'],
      ['--spacing-0-5', '2px'],
      ['--spacing-1', '4px'],
      ['--spacing-1-5', '6px'],
      ['--spacing-2', '8px'],
      ['--spacing-3', '12px'],
      ['--spacing-4', '16px'],
      ['--spacing-6', '24px'],
      ['--spacing-8', '32px'],
    ]

    it.each(spacingTokens)('defines %s spacing token', (token, expected) => {
      const value = rootStyles.getPropertyValue(token).trim()
      // Check that the token is defined (not empty)
      expect(value).toBeTruthy()
    })
  })

  describe('Typography Tokens (Task 1.2)', () => {
    const typographyTokens = [
      '--font-size-dense-xs', // 11px
      '--font-size-dense-sm', // 13px
      '--font-size-dense-base', // 15px
      '--font-size-dense-lg', // 17px
      '--font-size-dense-xl', // 20px
      '--font-size-dense-2xl', // 24px
      '--font-size-dense-3xl', // 30px
    ]

    it.each(typographyTokens)('defines %s typography token', (token) => {
      const value = rootStyles.getPropertyValue(token).trim()
      expect(value).toBeTruthy()
    })
  })

  describe('Height Tokens (Task 1.3)', () => {
    const heightTokens = [
      ['--height-compact', '28px'],
      ['--height-default', '36px'],
      ['--height-row', '40px'],
      ['--height-header', '48px'],
    ]

    it.each(heightTokens)('defines %s height token', (token, expected) => {
      const value = rootStyles.getPropertyValue(token).trim()
      expect(value).toBeTruthy()
    })
  })

  describe('Beacon Colors (Task 1.4)', () => {
    const beaconTokens = [
      '--color-beacon-error',
      '--color-beacon-warn',
      '--color-beacon-ok',
    ]

    it.each(beaconTokens)('defines %s beacon color', (token) => {
      const value = rootStyles.getPropertyValue(token).trim()
      expect(value).toBeTruthy()
    })
  })

  describe('Graph Node Colors (Task 1.5)', () => {
    const graphTokens = [
      '--color-graph-entity',
      '--color-graph-relation',
      '--color-graph-attribute',
    ]

    it.each(graphTokens)('defines %s graph color', (token) => {
      const value = rootStyles.getPropertyValue(token).trim()
      expect(value).toBeTruthy()
      // Verify it's an OKLCH color
      expect(value).toMatch(/oklch\(/)
    })
  })

  describe('Operation Colors (Task 1.6)', () => {
    const opTokens = [
      '--color-op-read',
      '--color-op-write',
      '--color-op-schema',
      '--color-op-commit',
      '--color-op-rollback',
    ]

    it.each(opTokens)('defines %s operation color', (token) => {
      const value = rootStyles.getPropertyValue(token).trim()
      expect(value).toBeTruthy()
      // Verify it's an OKLCH color
      expect(value).toMatch(/oklch\(/)
    })
  })

  describe('Syntax Highlighting Colors (Task 1.7)', () => {
    const syntaxTokens = [
      '--syntax-keyword-read',
      '--syntax-keyword-write',
      '--syntax-keyword-schema',
      '--syntax-keyword-struct',
      '--syntax-keyword-modifier',
      '--syntax-type',
      '--syntax-variable',
      '--syntax-string',
      '--syntax-number',
      '--syntax-comment',
      '--syntax-punctuation',
    ]

    it.each(syntaxTokens)('defines %s syntax color in light mode', (token) => {
      const value = rootStyles.getPropertyValue(token).trim()
      expect(value).toBeTruthy()
    })

    it('has dark mode variants for syntax colors', () => {
      // Add dark class to check dark mode values
      document.documentElement.classList.add('dark')
      const darkStyles = getComputedStyle(document.documentElement)

      syntaxTokens.forEach((token) => {
        const value = darkStyles.getPropertyValue(token).trim()
        expect(value).toBeTruthy()
      })

      // Clean up
      document.documentElement.classList.remove('dark')
    })
  })
})
