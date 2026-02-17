const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');

router.get('/', machineController.getAllMachines);
router.post('/', machineController.createMachine);
router.get('/stats', machineController.getMachineStats);
router.post('/reset-all', machineController.resetAllCounters);
router.put('/:id', machineController.updateMachine);

module.exports = router;
