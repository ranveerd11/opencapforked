const express = require('express');
const router = express.Router();
const Stakeholder = require('../../models/Stakeholder');

router.get('/', async (req, res) => {
  const stakeholders = await Stakeholder.find();
  res.status(200).json(stakeholders);
});

router.post('/', async (req, res) => {
  const stakeholder = new Stakeholder(req.body);
  await stakeholder.save();
  res.status(201).json(stakeholder);
});

module.exports = router;
