'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');

function fileResponse(filePath) {
  const body = fs.readFileSync(filePath, 'utf8');
  return {
    ok: true,
    status: 200,
    text: async () => body,
    json: async () => JSON.parse(body)
  };
}

/**
 * Serve repository fixtures through window.fetch so tests never touch the network.
 * Unknown URLs return a 404, which exercises the app's failure paths.
 */
function createFetchStub() {
  return async (url) => {
    const clean = decodeURIComponent(String(url).split('?')[0]).replace(/^\.?\//, '');
    const candidates = [
      path.join(ROOT, clean),
      path.join(ROOT, 'recipes', path.basename(clean))
    ];
    for (const file of candidates) {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        return fileResponse(file);
      }
    }
    return {
      ok: false,
      status: 404,
      text: async () => '',
      json: async () => ({})
    };
  };
}

function bootApp({ url = 'http://127.0.0.1:4189/index.html', fetchStub = createFetchStub(), storage = {} } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });
  const { window } = dom;

  // The application logs heavily; keep test output focused.
  window.console.log = () => {};
  window.console.warn = () => {};
  window.console.info = () => {};
  window.console.error = () => {};
  window.jsyaml = require('js-yaml');
  window.SmartCookbookConversions = require(path.join(ROOT, 'src', 'generated', 'conversions.js'));
  window.SMART_COOKBOOK_RECIPE_SCHEMA = require(path.join(ROOT, 'src', 'generated', 'recipe-schema.js'));
  window.RecipeValidation = require(path.join(ROOT, 'src', 'recipes', 'validation.js'));
  window.alert = (message) => {
    window.__alerts = (window.__alerts || []).concat(String(message));
  };
  window.confirm = () => true;
  window.fetch = fetchStub;
  Object.entries(storage).forEach(([key, value]) => {
    window.localStorage.setItem(key, String(value));
  });

  const script = window.document.createElement('script');
  script.textContent = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
  window.document.body.appendChild(script);

  const app = window.cookbookApp();
  return { app, window, dom };
}

function wait(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initApp(options = {}) {
  const harness = bootApp(options);
  await harness.app.init();
  // init() starts bootstrapRecipes and the data-loading chain without awaiting them.
  await wait(120);
  return harness;
}

function readYaml(relativePath) {
  const yaml = require('js-yaml');
  return yaml.load(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

module.exports = { ROOT, bootApp, initApp, readYaml, wait, createFetchStub };
