const request = require('supertest');
const { app, resetData } = require('../server');
// dwadmawodawdwa
describe('CPU Benchmark API', () => {
  // Reset the data before each test
  beforeEach(() => {
    resetData();
  });

  // Test GET /api/cpus
  describe('GET /api/cpus', () => {
    it('should return all CPUs', async () => {
      const res = await request(app)
        .get('/api/cpus')
        .expect(200);
      
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('currentPage');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2); // Initial data
    });
  });

  // Test POST /api/cpus
  describe('POST /api/cpus', () => {
    it('should create a new CPU', async () => {
      const newCpu = {
        cpuModel: 'Intel Core i9-13900K',
        score: 20000,
        nrCores: 24,
        clockSpeed: '3.0',
        manufacturingDate: '2023-01-15',
        priceUSD: 600
      };

      const res = await request(app)
        .post('/api/cpus')
        .send(newCpu)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.cpuModel).toBe(newCpu.cpuModel);
      expect(res.body.score).toBe(newCpu.score);
      expect(res.body.nrCores).toBe(newCpu.nrCores);
      expect(res.body.clockSpeed).toBe(newCpu.clockSpeed);
      expect(res.body.manufacturingDate).toBe(newCpu.manufacturingDate);
      expect(res.body.priceUSD).toBe(newCpu.priceUSD);

      // Verify the CPU was added to the list
      const getRes = await request(app).get('/api/cpus');
      expect(getRes.body.data.length).toBe(3); // Initial 2 + new 1
    });

    it('should return 400 for invalid CPU data', async () => {
      const invalidCpu = {
        cpuModel: '', // Invalid: empty string
        score: -100,  // Invalid: negative score
        nrCores: 0,   // Invalid: zero cores
        clockSpeed: 'invalid',
        manufacturingDate: 'invalid-date',
        priceUSD: -50 // Invalid: negative price
      };

      const res = await request(app)
        .post('/api/cpus')
        .send(invalidCpu)
        .expect(400);

      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  // Test POST /api/cpus/generate
  describe('POST /api/cpus/generate', () => {
    it('should generate specified number of CPUs', async () => {
      const count = 3;
      const res = await request(app)
        .post('/api/cpus/generate')
        .send({ count })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('currentPage');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(5); // Initial 2 + generated 3
    });

    it('should generate random number of CPUs if count not specified', async () => {
      const res = await request(app)
        .post('/api/cpus/generate')
        .send({})
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(2); // More than initial 2
    });
  });

  // Test DELETE /api/cpus/:id
  describe('DELETE /api/cpus/:id', () => {
    it('should delete an existing CPU', async () => {
      // First create a CPU to delete
      const newCpu = {
        cpuModel: 'Test CPU for Deletion',
        score: 10000,
        nrCores: 8,
        clockSpeed: '3.5',
        manufacturingDate: '2023-01-01',
        priceUSD: 300
      };

      const createRes = await request(app)
        .post('/api/cpus')
        .send(newCpu);

      const cpuId = createRes.body.id;

      // Now delete it
      const deleteRes = await request(app)
        .delete(`/api/cpus/${cpuId}`)
        .expect(200);

      expect(deleteRes.body).toHaveProperty('message');
      expect(deleteRes.body.message).toBe('CPU deleted successfully');

      // Verify it's actually deleted
      const getRes = await request(app)
        .get('/api/cpus');

      const deletedCpu = getRes.body.data.find(cpu => cpu.id === cpuId);
      expect(deletedCpu).toBeUndefined();
      expect(getRes.body.data.length).toBe(2); // Back to initial 2
    });

    it('should return 404 for non-existent CPU', async () => {
      const nonExistentId = 999999;
      const res = await request(app)
        .delete(`/api/cpus/${nonExistentId}`)
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('CPU not found');
    });
  });

  // Test PUT /api/cpus/:id
  describe('PUT /api/cpus/:id', () => {
    it('should update an existing CPU', async () => {
      // First create a CPU to update
      const newCpu = {
        cpuModel: 'Test CPU for Update',
        score: 10000,
        nrCores: 8,
        clockSpeed: '3.5',
        manufacturingDate: '2023-01-01',
        priceUSD: 300
      };

      const createRes = await request(app)
        .post('/api/cpus')
        .send(newCpu);

      const cpuId = createRes.body.id;

      // Now update it
      const updatedData = {
        cpuModel: 'Updated Test CPU',
        score: 15000,
        nrCores: 12,
        clockSpeed: '4.0',
        manufacturingDate: '2023-02-01',
        priceUSD: 400
      };

      const updateRes = await request(app)
        .put(`/api/cpus/${cpuId}`)
        .send(updatedData)
        .expect(200);

      expect(updateRes.body).toHaveProperty('id');
      expect(updateRes.body.cpuModel).toBe(updatedData.cpuModel);
      expect(updateRes.body.score).toBe(updatedData.score);
      expect(updateRes.body.nrCores).toBe(updatedData.nrCores);
      expect(updateRes.body.clockSpeed).toBe(updatedData.clockSpeed);
      expect(updateRes.body.manufacturingDate).toBe(updatedData.manufacturingDate);
      expect(updateRes.body.priceUSD).toBe(updatedData.priceUSD);

      // Verify the update is reflected in the list
      const getRes = await request(app).get('/api/cpus');
      const updatedCpu = getRes.body.data.find(cpu => cpu.id === cpuId);
      expect(updatedCpu).toEqual(updateRes.body);
    });

    it('should return 404 for non-existent CPU', async () => {
      const nonExistentId = 999999;
      const updateData = {
        cpuModel: 'Updated CPU',
        score: 15000,
        nrCores: 12,
        clockSpeed: '4.0',
        manufacturingDate: '2023-02-01',
        priceUSD: 400
      };

      const res = await request(app)
        .put(`/api/cpus/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('CPU not found');
    });

    it('should return 400 for invalid update data', async () => {
      // First create a CPU to update
      const newCpu = {
        cpuModel: 'Test CPU for Invalid Update',
        score: 10000,
        nrCores: 8,
        clockSpeed: '3.5',
        manufacturingDate: '2023-01-01',
        priceUSD: 300
      };

      const createRes = await request(app)
        .post('/api/cpus')
        .send(newCpu);

      const cpuId = createRes.body.id;

      // Try to update with invalid data
      const invalidData = {
        cpuModel: '', // Invalid: empty string
        score: -100,  // Invalid: negative score
        nrCores: 0,   // Invalid: zero cores
        clockSpeed: 'invalid',
        manufacturingDate: 'invalid-date',
        priceUSD: -50 // Invalid: negative price
      };

      const res = await request(app)
        .put(`/api/cpus/${cpuId}`)
        .send(invalidData)
        .expect(400);

      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });
}); 