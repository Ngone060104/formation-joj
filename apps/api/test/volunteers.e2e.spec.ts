import type { INestApplication } from '@nestjs/common';
import { disciplineSchema, registrationSchema, slotSchema, type SlotResponse } from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

const UNKNOWN_ID = '0199f5c2-0000-7000-8000-00000000ffff';
const STARTS_AT = '2026-11-01T09:00:00.000Z';
const ENDS_AT = '2026-11-01T12:00:00.000Z';

const awa = { name: 'Awa Diop', email: 'awa@example.org' };
const moussa = { name: 'Moussa Fall', email: 'moussa@example.org' };
const fatou = { name: 'Fatou Sow', email: 'fatou@example.org' };

describe('/api/slots (e2e)', () => {
  let app: INestApplication;
  let disciplineId: string;
  const api = () => request(app.getHttpServer());

  const validSlot = () => ({
    disciplineId,
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    capacity: 2,
  });

  const openSlot = async (capacity = 2): Promise<SlotResponse> => {
    const response = await api()
      .post('/api/slots')
      .send({ ...validSlot(), capacity })
      .expect(201);
    return slotSchema.parse(response.body);
  };

  const register = (slotId: string, volunteer: { name: string; email: string }) =>
    api().post(`/api/slots/${slotId}/registrations`).send(volunteer);

  beforeAll(async () => {
    app = await createTestApp();
    const response = await api()
      .post('/api/disciplines')
      .send({ name: 'Lutte', category: 'sports-de-combat' })
      .expect(201);
    disciplineId = disciplineSchema.parse(response.body).id;
  });

  afterAll(() => app?.close());

  it('001-AS1: opens a slot (201) with all its places remaining', async () => {
    const response = await api().post('/api/slots').send(validSlot()).expect(201);

    expect(slotSchema.parse(response.body)).toMatchObject({
      disciplineId,
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      capacity: 2,
      remainingPlaces: 2,
    });
  });

  it('001-AS2: refuses a slot for an unknown discipline (404)', async () => {
    const response = await api()
      .post('/api/slots')
      .send({ ...validSlot(), disciplineId: UNKNOWN_ID })
      .expect(404);

    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 404, code: 'DISCIPLINE_NOT_FOUND' });
  });

  it.each([0, -1, 1.5])('001-AS3: rejects a capacity of %d (400)', async (capacity) => {
    const response = await api()
      .post('/api/slots')
      .send({ ...validSlot(), capacity })
      .expect(400);

    expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(response.body.errors).toEqual([expect.objectContaining({ path: 'capacity' })]);
  });

  it('001-AS3: accepts a capacity of 1', async () => {
    expect((await openSlot(1)).remainingPlaces).toBe(1);
  });

  it.each(['2026-11-01T08:00:00.000Z', STARTS_AT])(
    '001-AS4: rejects an end at %s, not after the start (400)',
    async (endsAt) => {
      const response = await api()
        .post('/api/slots')
        .send({ ...validSlot(), endsAt })
        .expect(400);

      expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
      expect(response.body.errors).toEqual([expect.objectContaining({ path: 'endsAt' })]);
    },
  );

  it('001-AS5: registers a volunteer (201) and leaves one place', async () => {
    const slot = await openSlot();

    const response = await register(slot.id, awa).expect(201);

    expect(registrationSchema.parse(response.body)).toMatchObject({
      slotId: slot.id,
      ...awa,
      remainingPlaces: 1,
    });
  });

  it('001-AS6: accepts the last place (201) and leaves none', async () => {
    const slot = await openSlot();
    await register(slot.id, awa).expect(201);

    const response = await register(slot.id, moussa).expect(201);

    expect(registrationSchema.parse(response.body).remainingPlaces).toBe(0);
  });

  it('001-AS7: rejects a registration on a full slot (409)', async () => {
    const slot = await openSlot();
    await register(slot.id, awa).expect(201);
    await register(slot.id, moussa).expect(201);

    const response = await register(slot.id, fatou).expect(409);

    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 409, code: 'SLOT_FULL' });
  });

  it('001-AS8: accepts only one of two simultaneous registrations for the last place', async () => {
    const slot = await openSlot(1);

    const responses = await Promise.all([register(slot.id, awa), register(slot.id, moussa)]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(responses.find((response) => response.status === 409)?.body).toMatchObject({
      code: 'SLOT_FULL',
    });
    await register(slot.id, fatou).expect(409);
  });

  it('001-AS9: refuses a registration on an unknown slot (404)', async () => {
    const response = await register(UNKNOWN_ID, awa).expect(404);

    expect(response.body).toMatchObject({ status: 404, code: 'SLOT_NOT_FOUND' });
  });

  it.each([
    ['an empty name', { ...awa, name: '' }, 'name'],
    ['a blank name', { ...awa, name: '   ' }, 'name'],
    ['a malformed email', { ...awa, email: 'awa' }, 'email'],
  ])('001-AS10: rejects %s (400), and the place stays free', async (_label, volunteer, path) => {
    const slot = await openSlot();

    const response = await register(slot.id, volunteer).expect(400);

    expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(response.body.errors).toEqual([expect.objectContaining({ path })]);
    const next = await register(slot.id, awa).expect(201);
    expect(registrationSchema.parse(next.body).remainingPlaces).toBe(1);
  });
});
