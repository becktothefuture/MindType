/* @vitest-environment jsdom */
/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S E C U R E   F I E L D S   ( W E B )  ░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   DOM-based secure field detection for web hosts.            ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Validate isSecureElement and createDomSecurityContext
  • WHY  ▸ Ensure REQ-SECURE-FIELDS in browser contexts
  • HOW  ▸ Simulate activeElement and attributes
*/

import { describe, it, expect, beforeEach } from 'vitest';
import { createDomSecurityContext, isSecureElement } from '../ui/securityDetection';

describe('Web security detection', () => {
  let root: Document;

  beforeEach(() => {
    root = document.implementation.createHTMLDocument('test');
  });

  it('detects password input as secure', () => {
    const input = root.createElement('input');
    input.setAttribute('type', 'password');
    root.body.appendChild(input);
    Object.defineProperty(root, 'activeElement', { value: input, configurable: true });
    const ctx = createDomSecurityContext({ root });
    expect(ctx.isSecure()).toBe(true);
  });

  it('detects one-time-code as secure', () => {
    const input = root.createElement('input');
    input.setAttribute('type', 'text');
    (input as HTMLInputElement).autocomplete = 'one-time-code';
    root.body.appendChild(input);
    Object.defineProperty(root, 'activeElement', { value: input, configurable: true });
    const ctx = createDomSecurityContext({ root });
    expect(ctx.isSecure()).toBe(true);
  });

  it('detects credit card fields via autocomplete cc-* as secure', () => {
    const input = root.createElement('input');
    input.setAttribute('type', 'text');
    (input as HTMLInputElement).autocomplete = 'cc-number';
    root.body.appendChild(input);
    Object.defineProperty(root, 'activeElement', { value: input, configurable: true });
    const ctx = createDomSecurityContext({ root });
    expect(ctx.isSecure()).toBe(true);
  });

  it('respects data-secure attribute', () => {
    const div = root.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.setAttribute('data-secure', 'true');
    root.body.appendChild(div);
    Object.defineProperty(root, 'activeElement', { value: div, configurable: true });
    const ctx = createDomSecurityContext({ root });
    expect(ctx.isSecure()).toBe(true);
  });

  it('returns false for normal inputs', () => {
    const input = root.createElement('input');
    input.setAttribute('type', 'text');
    root.body.appendChild(input);
    Object.defineProperty(root, 'activeElement', { value: input, configurable: true });
    const ctx = createDomSecurityContext({ root });
    expect(ctx.isSecure()).toBe(false);
    expect(isSecureElement(input)).toBe(false);
  });
});
