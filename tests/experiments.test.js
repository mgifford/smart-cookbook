'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initApp } = require('./helpers/app');

const fillBaseline = (app) => {
  app.prepareExperimentForm();
  app.experimentForm.date = '2026-11-23';
  app.experimentForm.equipment.pan_type = 'flat_cast_iron';
  app.experimentForm.equipment.pan_size_inches = '12';
  app.experimentForm.equipment.surface = 'flat';
  app.experimentForm.observations.top_crispness = '4';
  app.experimentForm.observations.bottom_crispness = '3';
  app.experimentForm.observations.mushroom_intensity = '5';
  app.experimentForm.observations.creaminess = '4';
  app.experimentForm.actual_elapsed_minutes = '75';
  app.experimentForm.cost_cad = '18.50';
  app.experimentForm.notes = 'Baseline attempt.';
};

test('saving an experiment stores answered ratings and leaves unanswered ratings null', async () => {
  const { app, window } = await initApp();
  fillBaseline(app);
  app.saveExperiment();

  assert.equal(app.experiments.length, 1);
  const saved = app.experiments[0];
  assert.equal(saved.recipe_id, app.current.id);
  assert.equal(saved.observations.top_crispness, 4);
  assert.equal(saved.observations.sticking, null);
  assert.equal(saved.observations.cleaning_difficulty, null);
  assert.equal(saved.actual_elapsed_minutes, 75);
  assert.equal(saved.cost_cad, 18.5);
  assert.match(app.experimentStatus, /Saved locally/);
  assert.ok(JSON.parse(window.localStorage.getItem('cookbook-experiments')).length === 1);
});

test('experiment export/import preserves records and rejects invalid JSON', async () => {
  const { app } = await initApp();
  fillBaseline(app);
  app.saveExperiment();
  app.exportExperiments();
  const exported = JSON.parse(app.experimentJson);
  assert.equal(exported.format_version, '1.0');
  assert.equal(exported.experiments.length, 1);

  app.experimentJson = '{not json';
  app.importExperiments();
  assert.match(app.experimentStatus, /invalid JSON/);

  app.experimentJson = JSON.stringify({ experiments: [{
    id: 'exp-imported',
    recipe_id: app.current.id,
    date: '2026-11-24',
    equipment: { pan_type: 'ridged_cast_iron' },
    observations: { top_crispness: null }
  }] });
  app.importExperiments();
  assert.ok(app.experiments.some((experiment) => experiment.id === 'exp-imported'));
});

test('two experiments can be compared from stored records', async () => {
  const { app } = await initApp();
  fillBaseline(app);
  app.saveExperiment();
  app.resetExperimentForm();
  app.experimentForm.date = '2026-11-24';
  app.experimentForm.equipment.pan_type = 'ridged_cast_iron';
  app.experimentForm.equipment.surface = 'ridged';
  app.experimentForm.observations.bottom_crispness = '5';
  app.saveExperiment();

  app.refreshComparison();
  assert.ok(app.comparisonAId);
  assert.ok(app.comparisonBId);
  assert.notEqual(app.comparisonAId, app.comparisonBId);
  const rows = app.comparisonRows();
  assert.ok(rows.some((row) => row.label === 'Pan type'));
  assert.ok(rows.some((row) => row.label === 'Bottom crispness (1–5)'));
});

test('deleting an experiment removes it from storage', async () => {
  const { app } = await initApp();
  fillBaseline(app);
  app.saveExperiment();
  const id = app.experiments[0].id;
  app.deleteExperiment(id);
  assert.equal(app.experiments.length, 0);
  assert.equal(app.experimentStatus, 'Experiment deleted from this browser.');
});
