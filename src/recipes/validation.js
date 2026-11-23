/*
 * Shared, dependency-free recipe validation for the browser and Node.
 * It implements the JSON Schema subset used by schemas/recipe.schema.json.
 * CI still validates the complete schema with Ajv; this module keeps browser
 * imports on the same authored contract instead of a separate set of rules.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RecipeValidation = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SUPPORTED_SCHEMA_VERSION = '2.0';

  const typeOf = (value) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  const typesOf = (schemaType) => Array.isArray(schemaType) ? schemaType : [schemaType];

  const matchesType = (value, type) => {
    switch (type) {
      case 'null': return value === null;
      case 'array': return Array.isArray(value);
      case 'object': return typeOf(value) === 'object';
      case 'number': return typeof value === 'number' && Number.isFinite(value);
      case 'integer': return typeof value === 'number' && Number.isInteger(value);
      case 'string': return typeof value === 'string';
      case 'boolean': return typeof value === 'boolean';
      default: return true;
    }
  };

  const pathFor = (base, key) => base ? `${base}.${key}` : key;
  const indexFor = (base, index) => `${base}[${index}]`;

  const resolveRef = (ref, rootSchema) => {
    if (!ref.startsWith('#/')) throw new Error(`Unsupported $ref: ${ref}`);
    return ref.slice(2).split('/').reduce((node, part) => {
      const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
      return node && node[key];
    }, rootSchema);
  };

  const validateValue = (schema, value, path, rootSchema, errors) => {
    if (!schema || typeof schema !== 'object') return;
    if (schema.$ref) {
      const target = resolveRef(schema.$ref, rootSchema);
      validateValue(target, value, path, rootSchema, errors);
      return;
    }

    if (schema.type) {
      const allowed = typesOf(schema.type);
      if (!allowed.some((type) => matchesType(value, type))) {
        errors.push({
          path: path || '(root)',
          message: `Must be ${allowed.join(' or ')}, got ${typeOf(value)}.`,
          keyword: 'type'
        });
        return;
      }
    }

    if (schema.enum && !schema.enum.some((item) => item === value)) {
      errors.push({
        path: path || '(root)',
        message: `Must be one of: ${schema.enum.join(', ')}.`,
        keyword: 'enum'
      });
    }

    if (Object.prototype.hasOwnProperty.call(schema, 'const') && value !== schema.const) {
      errors.push({ path: path || '(root)', message: `Must equal ${schema.const}.`, keyword: 'const' });
    }

    if (typeof value === 'string') {
      if (Number.isInteger(schema.minLength) && value.length < schema.minLength) {
        errors.push({ path: path || '(root)', message: `Must be at least ${schema.minLength} character(s).`, keyword: 'minLength' });
      }
      if (schema.pattern) {
        try {
          if (!new RegExp(schema.pattern, 'u').test(value)) {
            errors.push({ path: path || '(root)', message: `Must match pattern ${schema.pattern}.`, keyword: 'pattern' });
          }
        } catch (_) {
          errors.push({ path: path || '(root)', message: 'Schema contains an invalid pattern.', keyword: 'pattern' });
        }
      }
    }

    if (typeof value === 'number') {
      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        errors.push({ path: path || '(root)', message: `Must be at least ${schema.minimum}.`, keyword: 'minimum' });
      }
      if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
        errors.push({ path: path || '(root)', message: `Must be greater than ${schema.exclusiveMinimum}.`, keyword: 'exclusiveMinimum' });
      }
      if (typeof schema.maximum === 'number' && value > schema.maximum) {
        errors.push({ path: path || '(root)', message: `Must be at most ${schema.maximum}.`, keyword: 'maximum' });
      }
    }

    if (Array.isArray(value)) {
      if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
        errors.push({ path: path || '(root)', message: `Must contain at least ${schema.minItems} item(s).`, keyword: 'minItems' });
      }
      if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
        errors.push({ path: path || '(root)', message: `Must contain at most ${schema.maxItems} item(s).`, keyword: 'maxItems' });
      }
      if (schema.uniqueItems) {
        const seen = new Set();
        value.forEach((item, index) => {
          const key = JSON.stringify(item);
          if (seen.has(key)) {
            errors.push({ path: indexFor(path || 'items', index), message: 'Items must be unique.', keyword: 'uniqueItems' });
          }
          seen.add(key);
        });
      }
      if (schema.items) {
        value.forEach((item, index) => validateValue(schema.items, item, indexFor(path || 'items', index), rootSchema, errors));
      }
    }

    if (typeOf(value) === 'object') {
      const required = Array.isArray(schema.required) ? schema.required : [];
      required.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          errors.push({ path: pathFor(path, key), message: 'Required field is missing.', keyword: 'required' });
        }
      });

      const properties = schema.properties || {};
      Object.keys(value).forEach((key) => {
        if (properties[key]) {
          validateValue(properties[key], value[key], pathFor(path, key), rootSchema, errors);
        } else if (schema.additionalProperties === false) {
          errors.push({ path: pathFor(path, key), message: 'Unexpected field is not allowed.', keyword: 'additionalProperties' });
        } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
          validateValue(schema.additionalProperties, value[key], pathFor(path, key), rootSchema, errors);
        }
      });
    }
  };

  const addSemanticChecks = (recipe, errors, warnings, options) => {
    if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) return;

    if (recipe.schema_version && recipe.schema_version !== SUPPORTED_SCHEMA_VERSION) {
      errors.push({
        path: 'schema_version',
        message: `Unsupported schema version "${recipe.schema_version}". Supported: ${SUPPORTED_SCHEMA_VERSION}; omit for legacy recipes.`,
        keyword: 'schemaVersion'
      });
    }

    if (options.legacyWarnings) {
      if (!recipe.id) warnings.push({ path: 'id', message: 'Legacy recipe has no explicit stable id; the filename will be used.', keyword: 'legacyId' });
      if (!recipe.schema_version) warnings.push({ path: 'schema_version', message: 'Legacy recipe has no schema_version.', keyword: 'legacyVersion' });
    }

    (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).forEach((ingredient, index) => {
      if (!ingredient || typeof ingredient !== 'object') return;
      const base = `ingredients[${index}]`;
      if (ingredient.estimated === true && !(typeof ingredient.qty_g === 'number' && Number.isFinite(ingredient.qty_g))) {
        errors.push({ path: `${base}.estimated`, message: 'An estimated ingredient must have a numeric qty_g.', keyword: 'estimatedQuantity' });
      }
      if (ingredient.qty_g === null && ingredient.estimated === true) {
        errors.push({ path: `${base}.qty_g`, message: 'A null quantity cannot be marked as estimated.', keyword: 'estimatedQuantity' });
      }
      if (ingredient.quantity_source
        && ingredient.quantity_source.method === 'estimated_from_description'
        && ingredient.estimated !== true) {
        warnings.push({ path: `${base}.estimated`, message: 'Quantity source says estimated, but estimated is not true.', keyword: 'quantitySource' });
      }
    });
  };

  function validateRecipe(recipe, options = {}) {
    const schema = options.schema
      || (typeof globalThis !== 'undefined' ? globalThis.SMART_COOKBOOK_RECIPE_SCHEMA : null)
      || (typeof window !== 'undefined' ? window.SMART_COOKBOOK_RECIPE_SCHEMA : null);
    const errors = [];
    const warnings = [];

    if (!schema) {
      errors.push({ path: '(root)', message: 'Recipe schema is unavailable.', keyword: 'schema' });
      return { valid: false, errors, warnings };
    }

    validateValue(schema, recipe, '', schema, errors);
    addSemanticChecks(recipe, errors, warnings, options);
    return { valid: errors.length === 0, errors, warnings };
  }

  return { validateRecipe, validateValue, SUPPORTED_SCHEMA_VERSION };
});
