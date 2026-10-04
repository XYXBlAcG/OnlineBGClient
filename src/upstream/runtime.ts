import * as React from 'react';
import { confirmation } from '../client/confirmation-controller';
import * as jsx from 'react/jsx-runtime';
import factories from './factories.js';
import { heroNames, skillNames, cardNames } from '../domain/terms';

type Exports = Record<string, any>;
type Factory = (module: { exports: Exports }, exports: Exports, require: any) => void;

export class UpstreamRuntime {
  bridge: { sink?: (action: unknown) => void } = {};
  private cache = new Map<number, Exports>();
  random: () => number = Math.random;

  constructor() {
    const load = Object.assign((id: number) => this.load(id), {
      d: (exports: Exports, values: Record<string, () => unknown>) => {
        for (const [key, get] of Object.entries(values)) Object.defineProperty(exports, key, { enumerable: true, get });
      },
      r: (exports: Exports) => Object.defineProperty(exports, '__esModule', { value: true }),
      n: (exports: Exports) => {
        const getter = exports?.__esModule ? () => exports.default : () => exports;
        Object.defineProperty(getter, 'a', { get: getter });
        return getter;
      },
      o: (object: object, key: string) => Object.hasOwn(object, key),
      bridge: this.bridge,
      g: globalThis,
    });
    this.require = load;
  }

  private require: any;

  load(id: number): Exports {
    if (this.cache.has(id)) return this.cache.get(id)!;
    const overrides: Record<number, () => Exports> = {
      7313: () => React,
      6417: () => jsx,
      161: () => ({ ot: false, at: false, ZP: false, wC: '#22252b' }),
      2335: () => ({ lN: '/upstream/', s_: { key: 'sgs', logo: 'sgs' } }),
      3953: () => ({ N: () => undefined, Z: (text: string, action: () => void) => { void confirmation.request(text, '确认结束').then(confirmed => { if (confirmed) action(); }); } }),
      3366: () => ({ Z: (message: string) => window.dispatchEvent(new CustomEvent('companion-notice', { detail: message })) }),
      4420: () => ({ M: (max: number) => Math.floor(this.random() * max), T: (values: unknown[]) => {
        const result = [...values];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(this.random() * (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      } }),
    };
    if (overrides[id]) {
      const value = overrides[id]();
      this.cache.set(id, value);
      return value;
    }
    const exports: Exports = {};
    const module = { exports };
    this.cache.set(id, exports);
    const factory = (factories as Record<number, Factory>)[id];
    if (!factory) throw new Error(`Missing Hullqin module ${id}`);
    factory(module, exports, this.require);
    let result = module.exports;
    if (id === 6435) result = new Proxy(result, { get: (target, key: string) => {
      const operation = target[key];
      if (!['Lk', 'Ih', 'yS', 'o7'].includes(key)) return operation;
      return (...args: any[]) => {
        if (!this.bridge.sink) return operation(...args);
        const action = key === 'Lk' ? { type: 'uno-start' } : key === 'Ih' ? { type: 'uno-draw' } : key === 'o7' ? { type: 'uno-report' } : { type: 'uno-play', card: args[1], color: args[2], jump: !!args[3], saidUno: !!args[4] };
        this.bridge.sink(action);
        return args[0];
      };
    } });
    if (id === 6139) result = new Proxy(result, { get: (target, key: string) => {
      const operation = target[key];
      if (!['JY', 'Uj', 'rG', 'G4'].includes(key)) return operation;
      return (...args: any[]) => {
        if (!this.bridge.sink) return operation(...args);
        this.bridge.sink(key === 'JY' ? { type: 'ddz-claim' } : key === 'Uj' ? { type: 'ddz-pass' } : key === 'G4' ? { type: 'round-restart' } : { type: 'ddz-play', cards: args[3] });
        return args[0];
      };
    } });
    if (id === 4062) result = new Proxy(result, { get: (target, key: string) => {
      const operation = target[key];
      if (!['HU', 'VX'].includes(key)) return operation;
      return (...args: any[]) => {
        if (!this.bridge.sink) return operation(...args);
        this.bridge.sink(key === 'HU' ? { type: 'fxq-roll' } : { type: 'fxq-move', plane: args[2] });
        return args[0];
      };
    } });
    if (id === 5328) result = new Proxy(result, { get: (target, key: string) => {
      const operation = target[key];
      if (key !== 'oe') return operation;
      return (...args: any[]) => {
        if (!this.bridge.sink) return operation(...args);
        this.bridge.sink({ type: 'tq-move', route: args[1] });
        return args[0];
      };
    } });
    if (id === 8467) result.V6.forEach((hero: any[], index: number) => { hero[0] = heroNames[index]; });
    if (id === 1983) result.H.forEach((skill: string[], index: number) => { skill.unshift(skillNames[index]); });
    if (id === 8280) result = { ...result, s2: (type: number) => cardNames[type] };
    this.cache.set(id, result);
    return result;
  }
}
