/**
 * Dense-Core Token Tests (Phase 1)
 *
 * Verifies that all Dense-Core design tokens are properly defined
 * and accessible via Tailwind utilities.
 *
 * Note: Tokens defined in @theme inline are compile-time values for
 * Tailwind utility generation - they're not runtime CSS variables.
 * These tests verify the utilities work correctly.
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

  describe('Spacing Tokens (Task 1.1)', () => {
    const spacingTests = [
      { token: '--spacing-0', utilityClass: 'gap-0', cssProperty: 'gap', expected: '0px' },
      { token: '--spacing-0-5', utilityClass: 'gap-0-5', cssProperty: 'gap', expected: '2px' },
      { token: '--spacing-1', utilityClass: 'gap-1', cssProperty: 'gap', expected: '4px' },
      { token: '--spacing-1-5', utilityClass: 'gap-1-5', cssProperty: 'gap', expected: '6px' },
      { token: '--spacing-2', utilityClass: 'gap-2', cssProperty: 'gap', expected: '8px' },
      { token: '--spacing-3', utilityClass: 'gap-3', cssProperty: 'gap', expected: '12px' },
      { token: '--spacing-4', utilityClass: 'gap-4', cssProperty: 'gap', expected: '16px' },
      { token: '--spacing-6', utilityClass: 'gap-6', cssProperty: 'gap', expected: '24px' },
      { token: '--spacing-8', utilityClass: 'gap-8', cssProperty: 'gap', expected: '32px' },
    ]

    it.each(spacingTests)(
      'applies $token via $utilityClass utility',
      ({ utilityClass, cssProperty, expected }) => {
        const el = createTestElement(utilityClass)
        const value = getComputedValue(el, cssProperty)
        expect(value).toBe(expected)
        el.remove()
      }
    )
  })

  describe('Typography Tokens (Task 1.2)', () => {
    const typographyTests = [
      { token: '--font-size-dense-xs', utilityClass: 'text-dense-xs', expected: '11px' },
      { token: '--font-size-dense-sm', utilityClass: 'text-dense-sm', expected: '13px' },
      { token: '--font-size-dense-base', utilityClass: 'text-dense-base', expected: '15px' },
      { token: '--font-size-dense-lg', utilityClass: 'text-dense-lg', expected: '17px' },
      { token: '--font-size-dense-xl', utilityClass: 'text-dense-xl', expected: '20px' },
      { token: '--font-size-dense-2xl', utilityClass: 'text-dense-2xl', expected: '24px' },
      { token: '--font-size-dense-3xl', utilityClass: 'text-dense-3xl', expected: '30px' },
    ]

    it.each(typographyTests)(
      'applies $token via $utilityClass utility',
      ({ utilityClass, expected }) => {
        const el = createTestElement(utilityClass)
        const value = getComputedValue(el, 'font-size')
        expect(value).toBe(expected)
        el.remove()
      }
    )
  })

  describe('Height Tokens (Task 1.3)', () => {
    const heightTests = [
      { token: '--height-compact', utilityClass: 'h-compact', expected: '28px' },
      { token: '--height-default', utilityClass: 'h-default', expected: '36px' },
      { token: '--height-row', utilityClass: 'h-row', expected: '40px' },
      { token: '--height-header', utilityClass: 'h-header', expected: '48px' },
    ]

    it.each(heightTests)(
      'applies $token via $utilityClass utility',
      ({ utilityClass, expected }) => {
        const el = createTestElement(utilityClass)
        const value = getComputedValue(el, 'height')
        expect(value).toBe(expected)
        el.remove()
      }
    )
  })

  describe('Beacon Colors (Task 1.4)', () => {
    const beaconTests = [
      { token: '--color-beacon-error', utilityClass: 'bg-beacon-error' },
      { token: '--color-beacon-warn', utilityClass: 'bg-beacon-warn' },
      { token: '--color-beacon-ok', utilityClass: 'bg-beacon-ok' },
    ]

    it.each(beaconTests)(
      'applies $token via $utilityClass utility',
      ({ utilityClass }) => {
        const el = createTestElement(utilityClass)
        const value = getComputedValue(el, 'background-color')
        // Should have a non-transparent background color
        expect(value).not.toBe('')
        expect(value).not.toBe('rgba(0, 0, 0, 0)')
        expect(value).not.toBe('transparent')
        el.remove()
      }
    )
  })

  describe('Graph Node Colors (Task 1.5)', () => {
    const graphTests = [
      { token: '--color-graph-entity', utilityClass: 'bg-graph-entity' },
      { token: '--color-graph-relation', utilityClass: 'bg-graph-relation' },
      { token: '--color-graph-attribute', utilityClass: 'bg-graph-attribute' },
    ]

    it.each(graphTests)(
      'applies $token via $utilityClass utility',
      ({ utilityClass }) => {
        const el = createTestElement(utilityClass)
        const value = getComputedValue(el, 'background-color')
        // Should have a non-transparent background color
        expect(value).not.toBe('')
        expect(value).not.toBe('rgba(0, 0, 0, 0)')
        expect(value).not.toBe('transparent')
        el.remove()
      }
    )
  })

  describe('Operation Colors (Task 1.6)', () => {
    const opTests = [
      { token: '--color-op-read', utilityClass: 'bg-op-read' },
      { token: '--color-op-write', utilityClass: 'bg-op-write' },
      { token: '--color-op-schema', utilityClass: 'bg-op-schema' },
      { token: '--color-op-commit', utilityClass: 'bg-op-commit' },
      { token: '--color-op-rollback', utilityClass: 'bg-op-rollback' },
    ]

    it.each(opTests)(
      'applies $token via $utilityClass utility',
      ({ utilityClass }) => {
        const el = createTestElement(utilityClass)
        const value = getComputedValue(el, 'background-color')
        // Should have a non-transparent background color
        expect(value).not.toBe('')
        expect(value).not.toBe('rgba(0, 0, 0, 0)')
        expect(value).not.toBe('transparent')
        el.remove()
      }
    )
  })

  describe('Syntax Highlighting Colors (Task 1.7)', () => {
    // Syntax tokens are defined in :root, so we can test them as CSS variables
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

    // Also test the utility classes
    const syntaxUtilityTests = [
      { token: '--syntax-keyword-read', utilityClass: 'text-syntax-keyword-read' },
      { token: '--syntax-keyword-write', utilityClass: 'text-syntax-keyword-write' },
      { token: '--syntax-keyword-schema', utilityClass: 'text-syntax-keyword-schema' },
      { token: '--syntax-keyword-struct', utilityClass: 'text-syntax-keyword-struct' },
      { token: '--syntax-keyword-modifier', utilityClass: 'text-syntax-keyword-modifier' },
      { token: '--syntax-type', utilityClass: 'text-syntax-type' },
      { token: '--syntax-variable', utilityClass: 'text-syntax-variable' },
      { token: '--syntax-string', utilityClass: 'text-syntax-string' },
      { token: '--syntax-number', utilityClass: 'text-syntax-number' },
      { token: '--syntax-comment', utilityClass: 'text-syntax-comment' },
      { token: '--syntax-punctuation', utilityClass: 'text-syntax-punctuation' },
    ]

    it.each(syntaxUtilityTests)(
      'applies $token via $utilityClass utility',
      ({ utilityClass }) => {
        const el = createTestElement(utilityClass)
        const value = getComputedValue(el, 'color')
        // Should have a non-default color
        expect(value).not.toBe('')
        el.remove()
      }
    )
  })
})
