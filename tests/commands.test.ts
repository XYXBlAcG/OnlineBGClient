import { describe, expect, it } from 'vitest';
import { CommandRegistry, type KeyInput } from '../src/client/commands';

const key = (overrides: Partial<KeyInput> = {}): KeyInput => ({ key: 'Enter', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, isComposing: false, editing: false, ...overrides });

describe('contextual game commands', () => {
  it('dispatches only enabled commands in the active game scope', () => {
    const registry = new CommandRegistry();
    const actions: string[] = [];
    registry.register({ id: 'uno.submit', title: '出牌', scope: 'uno', binding: 'Enter', enabled: () => true, run: () => actions.push('uno') });
    registry.register({ id: 'tq.submit', title: '移动', scope: 'tq', binding: 'Enter', enabled: () => true, run: () => actions.push('tq') });
    expect(registry.dispatch(key(), 'tq')).toBe(true);
    expect(actions).toEqual(['tq']);
    expect(registry.dispatch(key(), 'sgs')).toBe(false);
  });
  it('does not dispatch while typing, composing, repeating or when disabled', () => {
    const registry = new CommandRegistry();
    let calls = 0;
    registry.register({ id: 'submit', title: '提交', scope: 'uno', binding: 'Enter', enabled: () => false, run: () => calls++ });
    expect(registry.dispatch(key(), 'uno')).toBe(false);
    for (const input of [{ editing: true }, { isComposing: true }, { repeat: true }]) expect(registry.dispatch(key(input), 'uno')).toBe(false);
    expect(calls).toBe(0);
  });
  it('detects global conflicts, allows separate game scopes and validates edited bindings', () => {
    const registry = new CommandRegistry();
    for (const scope of ['uno', 'tq']) registry.register({ id: scope, scope, title: scope, binding: 'Enter', enabled: () => true, run: () => {} });
    registry.register({ id: 'help', scope: 'global', title: '帮助', binding: 'F1', enabled: () => true, run: () => {} });
    expect(() => registry.bind('help', 'Enter')).toThrow('冲突');
    expect(() => registry.bind('uno', 'Meta+Q')).toThrow('系统');
    registry.bind('uno', 'Control+Enter');
    expect(registry.dispatch(key({ ctrlKey: true }), 'uno')).toBe(true);
  });
});
