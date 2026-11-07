/**
 * La fausse API tient le même contrat que apps/api : si elle s'en écarte, les tests du front
 * passent contre une API qui n'existe pas. Ces tests l'appellent avec `fetch`, sans React.
 */
import { registrationSchema, slotSchema } from '@joj/shared';
import { describe, expect, it } from 'vitest';
import { mockControl } from './control';
import { lutte, natation, UNKNOWN_ID } from './fixture';

const call = (path: string, init: RequestInit = {}) =>
  fetch(`http://localhost${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });

const json = (body: unknown) => JSON.stringify(body);

describe('mock disciplines API', () => {
  it('000-AS5: lists the disciplines sorted by name', async () => {
    const response = await call('/api/disciplines');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([lutte, natation]);
  });

  it('000-AS1: creates a discipline, then lists it', async () => {
    const created = await call('/api/disciplines', {
      method: 'POST',
      body: json({ name: 'Escrime', category: 'sports-de-combat' }),
    });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ name: 'Escrime', category: 'sports-de-combat' });

    const names = ((await (await call('/api/disciplines')).json()) as { name: string }[]).map(
      (d) => d.name,
    );
    expect(names).toEqual(['Escrime', 'Lutte', 'Natation']);
  });

  it('000-AS2: rejects an empty name with a 400 VALIDATION_FAILED problem', async () => {
    const response = await call('/api/disciplines', {
      method: 'POST',
      body: json({ name: '', category: 'athletisme' }),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      errors: [expect.objectContaining({ path: 'name' })],
    });
  });

  it('000-AS4: rejects a taken name with a 409 DISCIPLINE_NAME_TAKEN problem', async () => {
    const response = await call('/api/disciplines', {
      method: 'POST',
      body: json({ name: 'Lutte', category: 'sports-de-combat' }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'DISCIPLINE_NAME_TAKEN' });
  });

  it('000-AS6: returns one discipline by id', async () => {
    const response = await call(`/api/disciplines/${lutte.id}`);
    expect(await response.json()).toEqual(lutte);
  });

  it('000-AS7: updates only the fields sent', async () => {
    const response = await call(`/api/disciplines/${lutte.id}`, {
      method: 'PATCH',
      body: json({ name: 'Lutte sénégalaise' }),
    });
    expect(await response.json()).toEqual({ ...lutte, name: 'Lutte sénégalaise' });
  });

  it('000-AS9: rejects a rename to the name of another discipline with a 409', async () => {
    const response = await call(`/api/disciplines/${lutte.id}`, {
      method: 'PATCH',
      body: json({ name: 'Natation' }),
    });
    expect(response.status).toBe(409);
  });

  it('000-AS10: deletes a discipline with a 204', async () => {
    const response = await call(`/api/disciplines/${lutte.id}`, { method: 'DELETE' });
    expect(response.status).toBe(204);
    expect((await call(`/api/disciplines/${lutte.id}`)).status).toBe(404);
  });

  it.each(['GET', 'PATCH', 'DELETE'])(
    '000-AS11: answers %s on an unknown id with a 404 DISCIPLINE_NOT_FOUND problem',
    async (method) => {
      const response = await call(`/api/disciplines/${UNKNOWN_ID}`, {
        method,
        ...(method === 'PATCH' ? { body: json({ name: 'X' }) } : {}),
      });
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ code: 'DISCIPLINE_NOT_FOUND' });
    },
  );
});

describe('mock slots API', () => {
  const awa = { name: 'Awa Diop', email: 'awa@example.org' };

  const openSlot = (capacity: number, disciplineId = lutte.id) =>
    call('/api/slots', {
      method: 'POST',
      body: json({
        disciplineId,
        startsAt: '2026-11-01T09:00:00.000Z',
        endsAt: '2026-11-01T12:00:00.000Z',
        capacity,
      }),
    });

  const register = (slotId: string, body: unknown = awa) =>
    call(`/api/slots/${slotId}/registrations`, { method: 'POST', body: json(body) });

  const openedSlotId = async (capacity: number) =>
    ((await (await openSlot(capacity)).json()) as { id: string }).id;

  it('001-AS1: opens a slot with all its places remaining', async () => {
    const response = await openSlot(2);

    expect(response.status).toBe(201);
    expect(slotSchema.parse(await response.json())).toMatchObject({
      disciplineId: lutte.id,
      capacity: 2,
      remainingPlaces: 2,
    });
  });

  it('001-AS2: refuses a slot for an unknown discipline with a 404 problem', async () => {
    const response = await openSlot(2, UNKNOWN_ID);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'DISCIPLINE_NOT_FOUND' });
  });

  it('001-AS3: rejects a capacity of 0 with a 400 VALIDATION_FAILED problem', async () => {
    const response = await openSlot(0);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('001-AS5: registers a volunteer and leaves one place', async () => {
    const slotId = await openedSlotId(2);

    const response = await register(slotId);

    expect(response.status).toBe(201);
    expect(registrationSchema.parse(await response.json())).toMatchObject({
      slotId,
      ...awa,
      remainingPlaces: 1,
    });
  });

  it('001-AS7: rejects a full slot with a 409 SLOT_FULL problem', async () => {
    const slotId = await openedSlotId(1);
    await register(slotId);

    const response = await register(slotId);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'SLOT_FULL', details: { id: slotId } });
  });

  it('001-AS9: refuses an unknown slot with a 404 SLOT_NOT_FOUND problem', async () => {
    const response = await register(UNKNOWN_ID);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'SLOT_NOT_FOUND' });
  });

  it('001-AS10: rejects a malformed email and keeps the place free', async () => {
    const slotId = await openedSlotId(1);

    const response = await register(slotId, { ...awa, email: 'awa' });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await register(slotId)).status).toBe(201);
  });
});

describe('mockControl', () => {
  it('fails the next request only, then answers normally', async () => {
    mockControl.failNext('GET /api/disciplines', 503);
    expect((await call('/api/disciplines')).status).toBe(503);
    expect((await call('/api/disciplines')).status).toBe(200);
  });

  it('keeps failing until reset when the failure is persistent', async () => {
    mockControl.failPersistently('DELETE /api/disciplines/:id');
    expect((await call(`/api/disciplines/${lutte.id}`, { method: 'DELETE' })).status).toBe(500);
    expect((await call(`/api/disciplines/${lutte.id}`, { method: 'DELETE' })).status).toBe(500);
    mockControl.reset();
    expect((await call(`/api/disciplines/${lutte.id}`, { method: 'DELETE' })).status).toBe(204);
  });

  it('restores the original data on reset', async () => {
    await call(`/api/disciplines/${lutte.id}`, { method: 'DELETE' });
    mockControl.reset();
    expect(await (await call('/api/disciplines')).json()).toEqual([lutte, natation]);
  });
});
