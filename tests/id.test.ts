import {it,expect,vi} from 'vitest';
import {newId} from '@/lib/id';
it('creates a valid unique v4 UUID on HTTP previews',()=>{const real=crypto;vi.stubGlobal('crypto',{getRandomValues:real.getRandomValues.bind(real)});try{const a=newId(),b=newId();expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);expect(a).not.toBe(b)}finally{vi.unstubAllGlobals()}});
