const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { GrammarRule, GrammarExercise } = require('../database');
const { safeError } = require('../utils');

// ───── Grammar Rules ─────

// Get all rules (with optional level filter)
router.get('/rules', async (req, res) => {
  try {
    const where = {};
    if (req.query.level) where.level = parseInt(req.query.level);

    const rules = await GrammarRule.findAll({
      where,
      order: [['level', 'ASC'], ['title', 'ASC']]
    });
    res.json(rules.map(r => ({
      ...r.toJSON(),
      examples: r.examples ? JSON.parse(r.examples) : []
    })));
  } catch (error) {
    safeError(res, error);
  }
});

// Get single rule by ID
router.get('/rules/:id', async (req, res) => {
  try {
    const rule = await GrammarRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Правило не найдено' });
    res.json({
      ...rule.toJSON(),
      examples: rule.examples ? JSON.parse(rule.examples) : []
    });
  } catch (error) {
    safeError(res, error);
  }
});

// ───── Grammar Exercises ─────

// Get exercises for a rule
router.get('/exercises/:ruleId', async (req, res) => {
  try {
    const exercises = await GrammarExercise.findAll({
      where: { rule_id: req.params.ruleId },
      order: [['id', 'ASC']]
    });
    res.json(exercises.map(e => ({
      ...e.toJSON(),
      options: JSON.parse(e.options)
    })));
  } catch (error) {
    safeError(res, error);
  }
});

// Get random exercises (count param, default 5)
router.get('/exercises/random', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 5, 20);
    const exercises = await GrammarExercise.findAll({
      order: Sequelize.literal('RANDOM()'),
      limit: count
    });
    res.json(exercises.map(e => ({
      ...e.toJSON(),
      options: JSON.parse(e.options)
    })));
  } catch (error) {
    safeError(res, error);
  }
});

// Get random exercises for a specific rule
router.get('/exercises/random/:ruleId', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 5, 20);
    const exercises = await GrammarExercise.findAll({
      where: { rule_id: req.params.ruleId },
      order: Sequelize.literal('RANDOM()'),
      limit: count
    });
    res.json(exercises.map(e => ({
      ...e.toJSON(),
      options: JSON.parse(e.options)
    })));
  } catch (error) {
    safeError(res, error);
  }
});

module.exports = router;
