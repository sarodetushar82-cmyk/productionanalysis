const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');

router.get('/shift', productionController.getShiftProduction);
router.get('/hourly', productionController.getHourlyProduction);

module.exports = router;
