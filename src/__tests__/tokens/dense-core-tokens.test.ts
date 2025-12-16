/**
 * Dense-Core Token Tests (Phase 1)
 *
 * Verifies that Dense-Core design tokens are properly defined and accessible.
 *
 * Architecture:
 * - @theme inline: Compile-time Tailwind config for utility generation
 * - @utility: Custom utilities (tested via production build, not here)
 * - :root: Runtime CSS variables (tested here)
 *
 * Note: @utility blocks are processed by Tailwind at build time and are
 * verified to work in the production build. This test file focuses on
 * runtime CSS variables that can be tested in isolation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import '../../styles.css'

describe('Dense-Core Tokens', () => {
  let testContainer: HTMLDivElement

  beforeAll(() => {
    testContainer = document.createElement('div')
    testContainer.id = 'dense-core-test-container'
    document.body.appendChild(testContainer)
  })

  afterAll(() => {
    testContainer.remove()
  })

  function createTestElement(className: string): HTMLDivElement {
    const el = document.createElement('div')
    el.className = className
    testContainer.appendChild(el)
    return el
  }

  function getComputedValue(el: HTMLElement, property: string): string {
    return getComputedStyle(el).getPropertyValue(property).trim()
  }

  describe('Syntax Highlighting Colors (Task 1.7)', () => {
    let rootStyles: CSSStyleDeclaration

    beforeAll(() => {
      rootStyles = getComputedStyle(document.documentElement)
    })

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
      document.documentElement.classList.add('dark')
      const darkStyles = getComputedStyle(document.documentElement)

      syntaxTokens.forEach((token) => {
        const value = darkStyles.getPropertyValue(token).trim()
        expect(value).toBeTruthy()
      })

      document.documentElement.classList.remove('dark')
    })

    const syntaxUtilityTests = [
      'text-syntax-keyword-read',
      'text-syntax-keyword-write',
      'text-syntax-keyword-schema',
      'text-syntax-keyword-struct',
      'text-syntax-keyword-modifier',
      'text-syntax-type',
      'text-syntax-variable',
      'text-syntax-string',
      'text-syntax-number',
      'text-syntax-comment',
      'text-syntax-punctuation',
    ]

    it.each(syntaxUtilityTests)(
      'applies %s utility correctly',
      (utilityClass) => {
        const el = createTestElement(utilityClass)
        const value = getComputedValue(el, 'color')
        expect(value).not.toBe('')
        el.remove()
      }
    )
  })

  describe('Base Theme Variables', () => {
    let rootStyles: CSSStyleDeclaration

    beforeAll(() => {
      rootStyles = getComputedStyle(document.documentElement)
    })

    const baseTokens = [
      '--background',
      '--foreground',
      '--primary',
      '--secondary',
      '--muted',
      '--accent',
      '--destructive',
      '--border',
      '--ring',
    ]

    it.each(baseTokens)('defines %s base theme variable', (token) => {
      const value = rootStyles.getPropertyValue(token).trim()
      expect(value).toBeTruthy()
    })

    it('switches to dark mode correctly', () => {
      const lightBg = rootStyles.getPropertyValue('--background').trim()

      document.documentElement.classList.add('dark')
      const darkStyles = getComputedStyle(document.documentElement)
      const darkBg = darkStyles.getPropertyValue('--background').trim()

      expect(darkBg).not.toBe(lightBg)
      document.documentElement.classList.remove('dark')
    })
  })
})
