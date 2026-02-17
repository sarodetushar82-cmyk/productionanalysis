const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/check', authController.checkAuth);
router.post('/register', authController.isAuthenticated, authController.register); // Only logged in users can create users
router.post('/change-password', authController.isAuthenticated, authController.changePassword);
router.post('/verify-action', authController.isAuthenticated, authController.verifyAction);

module.exports = router;
