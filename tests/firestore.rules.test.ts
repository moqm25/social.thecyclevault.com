import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
} from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

/**
 * Security-rules tests — assert each row of the capability matrix
 * (docs/SECURITY_RULES.md §2), both allowed and denied, including field-smuggle
 * and role-escalation attempts. These guard the LAST line of defense.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'cyclevault-social-rules-test',
    firestore: { rules },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

/** Seed a doc bypassing rules (admin context). */
async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const [col, id] = path.split('/');
    await setDoc(doc(ctx.firestore(), col, id), data);
  });
}

const ALICE = 'alice';
const BOB = 'bob';

function aliceDb() {
  return testEnv.authenticatedContext(ALICE).firestore();
}
function bobDb() {
  return testEnv.authenticatedContext(BOB).firestore();
}
function guestDb() {
  return testEnv.unauthenticatedContext().firestore();
}

describe('users collection', () => {
  beforeEach(async () => {
    await seed(`users/${ALICE}`, {
      uid: ALICE,
      username: 'Alice',
      role: 'user',
      status: 'active',
      bio: '',
      karma: 0,
    });
  });

  it('profiles are publicly readable', async () => {
    await assertSucceeds(getDoc(doc(guestDb(), 'users', ALICE)));
  });

  it('a user can edit their own bio/displayName', async () => {
    await assertSucceeds(
      updateDoc(doc(aliceDb(), 'users', ALICE), { bio: 'hello', displayName: 'Al' }),
    );
  });

  it('a user CANNOT escalate their own role (field smuggle)', async () => {
    await assertFails(updateDoc(doc(aliceDb(), 'users', ALICE), { role: 'admin' }));
  });

  it('a user CANNOT change their own status', async () => {
    await assertFails(updateDoc(doc(aliceDb(), 'users', ALICE), { status: 'banned' }));
  });

  it('a user CANNOT inflate their own karma', async () => {
    await assertFails(updateDoc(doc(aliceDb(), 'users', ALICE), { karma: 9999 }));
  });

  it('a user CANNOT edit someone else’s profile', async () => {
    await seed(`users/${BOB}`, { uid: BOB, username: 'Bob', role: 'user', status: 'active', bio: '' });
    await assertFails(updateDoc(doc(aliceDb(), 'users', BOB), { bio: 'hacked' }));
  });

  it('clients cannot create user docs directly (functions only)', async () => {
    await assertFails(setDoc(doc(bobDb(), 'users', BOB), { uid: BOB, role: 'user' }));
  });
});

describe('posts collection', () => {
  beforeEach(async () => {
    await seed('posts/p1', { authorId: ALICE, status: 'active', score: 0, title: 'Hi' });
    await seed('posts/p2', { authorId: ALICE, status: 'removed', score: 0, title: 'Gone' });
  });

  it('anyone can read active posts', async () => {
    await assertSucceeds(getDoc(doc(guestDb(), 'posts', 'p1')));
  });

  it('normal users cannot read removed posts', async () => {
    await assertFails(getDoc(doc(bobDb(), 'posts', 'p2')));
  });

  it('clients cannot write posts directly (functions only)', async () => {
    await assertFails(
      setDoc(doc(aliceDb(), 'posts', 'p3'), { authorId: ALICE, status: 'active', score: 100 }),
    );
  });
});

describe('votes collection', () => {
  beforeEach(async () => {
    await seed(`votes/${ALICE}_post_p1`, { uid: ALICE, targetType: 'post', targetId: 'p1', value: 1 });
  });

  it('a user can read their own vote', async () => {
    await assertSucceeds(getDoc(doc(aliceDb(), 'votes', `${ALICE}_post_p1`)));
  });

  it('a user cannot read someone else’s vote', async () => {
    await assertFails(getDoc(doc(bobDb(), 'votes', `${ALICE}_post_p1`)));
  });

  it('clients cannot write votes directly (functions only)', async () => {
    await assertFails(
      setDoc(doc(bobDb(), 'votes', `${BOB}_post_p1`), {
        uid: BOB,
        targetType: 'post',
        targetId: 'p1',
        value: 1,
      }),
    );
  });
});

describe('notifications collection', () => {
  beforeEach(async () => {
    await seed('notifications/n1', { recipientId: ALICE, read: false, type: 'system', title: 'Hi' });
  });

  it('recipient can read their notification', async () => {
    await assertSucceeds(getDoc(doc(aliceDb(), 'notifications', 'n1')));
  });

  it('non-recipient cannot read it', async () => {
    await assertFails(getDoc(doc(bobDb(), 'notifications', 'n1')));
  });

  it('recipient may only flip read=true, nothing else', async () => {
    await assertSucceeds(updateDoc(doc(aliceDb(), 'notifications', 'n1'), { read: true }));
    await assertFails(updateDoc(doc(aliceDb(), 'notifications', 'n1'), { title: 'tampered' }));
  });
});

describe('audit logs & bans (privileged reads)', () => {
  beforeEach(async () => {
    await seed('auditLogs/l1', { event: 'role_change' });
    await seed('bans/b1', { uid: BOB, active: true });
    await seed(`users/${ALICE}`, { uid: ALICE, username: 'Alice', role: 'user', status: 'active', bio: '' });
  });

  it('normal users cannot read audit logs', async () => {
    await assertFails(getDoc(doc(aliceDb(), 'auditLogs', 'l1')));
  });

  it('normal users cannot read bans', async () => {
    await assertFails(getDoc(doc(aliceDb(), 'bans', 'b1')));
  });
});

describe('communities & settings (public read, no client write)', () => {
  beforeEach(async () => {
    await seed('communities/general', { slug: 'general', name: 'General' });
    await seed('settings/global', { maintenanceMode: false });
  });

  it('communities are public', async () => {
    await assertSucceeds(getDoc(doc(guestDb(), 'communities', 'general')));
  });

  it('settings are public', async () => {
    await assertSucceeds(getDoc(doc(guestDb(), 'settings', 'global')));
  });

  it('clients cannot write communities', async () => {
    await assertFails(setDoc(doc(aliceDb(), 'communities', 'hax'), { slug: 'hax' }));
  });
});

describe('default deny', () => {
  it('an undefined collection rejects all access', async () => {
    await assertFails(getDoc(doc(guestDb(), 'secretStuff', 'x')));
    await assertFails(setDoc(doc(aliceDb(), 'secretStuff', 'x'), { a: 1 }));
  });

  it('clients cannot delete content', async () => {
    await seed('posts/p9', { authorId: ALICE, status: 'active' });
    await assertFails(deleteDoc(doc(aliceDb(), 'posts', 'p9')));
  });
});
