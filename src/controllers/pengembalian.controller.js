const { ok } = require('../utils/response');
const service = require('../services/pengembalian.service');

exports.create = async (req, res) => {
  const hasil = await service.catat(req.body);
  ok(res, hasil, 'Pengembalian dicatat', 201);
};
