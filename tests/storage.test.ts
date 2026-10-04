import { it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RoomStore } from '../src/server/storage';
import { Room } from '../src/domain/room';

it('persists rooms atomically and reconstructs an actual round after reopening SQLite', () => {
  const directory = mkdtempSync(join(tmpdir(), 'onlinebg-'));
  const path = join(directory, 'rooms.sqlite');
  try {
    const room = new Room('table', { kind: 'uno', humans: 1, ai: [{ difficulty: 'easy', name: '' }], team: false, training: false });
    const token = room.claim('Alice'); room.start(token);
    room.act(token, 'start', room.version, { type: 'uno-start' });
    const store = new RoomStore(path); store.save(room); store.close();
    const restoredStore = new RoomStore(path);
    const restored = restoredStore.load()[0];
    expect(restored.state).toEqual(room.state);
    expect(restored.snapshot(token).paused).toBe(true);
    restoredStore.remove(room.id);
    expect(restoredStore.load()).toEqual([]);
    restoredStore.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
