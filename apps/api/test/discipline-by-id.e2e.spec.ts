import type { INestApplication } from '@nestjs/common';
import { disciplineSchema, type DisciplineResponse } from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

const UNKNOWN_ID = '0199f5c2-0000-7000-8000-00000000ffff';

describe('/api/disciplines/:id (e2e)', () => {
  let app: INestApplication;
  let lutte: DisciplineResponse;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  beforeEach(async () => {
    // Chaque test part d'une discipline neuve, au nom unique.
    const name = `Lutte ${crypto.randomUUID().slice(0, 8)}`;
    const response = await api()
      .post('/api/disciplines')
      .send({ name, category: 'sports-de-combat' })
      .expect(201);
    lutte = disciplineSchema.parse(response.body);
  });

  it('000-AS6: gets a discipline by its id (200)', async () => {
    const response = await api().get(`/api/disciplines/${lutte.id}`).expect(200);
    expect(response.body).toEqual(lutte);
  });

  it('000-AS7: updates the name and the category (200) and returns the discipline', async () => {
    const response = await api()
      .patch(`/api/disciplines/${lutte.id}`)
      .send({ name: ' Lutte sénégalaise ', category: 'athletisme' })
      .expect(200);

    expect(response.body).toEqual({ ...lutte, name: 'Lutte sénégalaise', category: 'athletisme' });
    const reread = await api().get(`/api/disciplines/${lutte.id}`).expect(200);
    expect(reread.body).toEqual(response.body);
  });

  it('000-AS7: updates the category alone', async () => {
    const response = await api()
      .patch(`/api/disciplines/${lutte.id}`)
      .send({ category: 'athletisme' })
      .expect(200);
    expect(response.body).toMatchObject({ name: lutte.name, category: 'athletisme' });
  });

  it.each([{ name: '' }, { category: 'jeux' }, {}])(
    '000-AS8: rejects an invalid update (400) and keeps the discipline unchanged (%j)',
    async (body) => {
      const response = await api().patch(`/api/disciplines/${lutte.id}`).send(body).expect(400);
      expect(response.body).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });

      const reread = await api().get(`/api/disciplines/${lutte.id}`).expect(200);
      expect(reread.body).toEqual(lutte);
    },
  );

  it('000-AS9: rejects a name taken by another discipline (409)', async () => {
    await api()
      .post('/api/disciplines')
      .send({ name: 'Natation', category: 'sports-nautiques' })
      .expect(201);

    const response = await api()
      .patch(`/api/disciplines/${lutte.id}`)
      .send({ name: 'Natation' })
      .expect(409);
    expect(response.body).toMatchObject({ code: 'DISCIPLINE_NAME_TAKEN' });
  });

  it('000-AS10: deletes a discipline (204), which then disappears', async () => {
    await api().delete(`/api/disciplines/${lutte.id}`).expect(204);

    await api().get(`/api/disciplines/${lutte.id}`).expect(404);
    const list = await api().get('/api/disciplines').expect(200);
    expect(list.body).not.toContainEqual(expect.objectContaining({ id: lutte.id }));
  });

  it('000-AS10: still deletes a discipline that has slots (204)', async () => {
    const slot = await api()
      .post('/api/slots')
      .send({
        disciplineId: lutte.id,
        startsAt: '2026-11-01T09:00:00.000Z',
        endsAt: '2026-11-01T12:00:00.000Z',
        capacity: 2,
      })
      .expect(201);

    await api().delete(`/api/disciplines/${lutte.id}`).expect(204);

    await api().get(`/api/disciplines/${lutte.id}`).expect(404);
    // Le créneau disparaît avec sa discipline : on ne peut plus s'y inscrire.
    const response = await api()
      .post(`/api/slots/${slot.body.id}/registrations`)
      .send({ name: 'Awa Diop', email: 'awa@example.org' })
      .expect(404);
    expect(response.body).toMatchObject({ code: 'SLOT_NOT_FOUND' });
  });

  it.each([
    ['GET', () => api().get(`/api/disciplines/${UNKNOWN_ID}`)],
    ['PATCH', () => api().patch(`/api/disciplines/${UNKNOWN_ID}`).send({ name: 'Judo' })],
    ['DELETE', () => api().delete(`/api/disciplines/${UNKNOWN_ID}`)],
  ])('000-AS11: answers 404 for an unknown discipline (%s)', async (_method, send) => {
    const response = await send().expect(404);
    expect(response.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(response.body).toMatchObject({ status: 404, code: 'DISCIPLINE_NOT_FOUND' });
  });

  it('000-AS11: rejects an id that is not a UUID (400)', async () => {
    const response = await api().get('/api/disciplines/pas-un-uuid').expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(response.body.errors).toEqual([expect.objectContaining({ path: 'id' })]);
  });
});
