/* Generated from schemas/recipe.schema.json. Do not edit by hand. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SMART_COOKBOOK_RECIPE_SCHEMA = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://mgifford.github.io/smart-cookbook/schemas/recipe.schema.json",
  "title": "Smart Cookbook Recipe",
  "description": "Canonical, versioned recipe record. Additional properties are allowed so older recipes and future optional metadata survive validation unchanged.",
  "type": "object",
  "required": [
    "meta",
    "ingredients",
    "steps",
    "science_notes",
    "history"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+$",
      "description": "Schema generation. Missing means a legacy pre-versioned recipe."
    },
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      "description": "Stable identifier. When present it must match the YAML filename without .yaml."
    },
    "meta": {
      "type": "object",
      "required": [
        "name",
        "source",
        "base_servings",
        "prep_time"
      ],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "source": {
          "type": "string",
          "minLength": 1
        },
        "base_servings": {
          "type": "number",
          "exclusiveMinimum": 0
        },
        "prep_time": {
          "type": "string",
          "minLength": 1
        },
        "cook_time": {
          "type": "string"
        },
        "notes": {
          "type": "string"
        },
        "status": {
          "type": "string"
        }
      },
      "additionalProperties": true
    },
    "provenance": {
      "type": "object",
      "properties": {
        "type": {
          "enum": [
            "source",
            "adaptation",
            "original",
            "family",
            "unknown"
          ]
        },
        "status": {
          "enum": [
            "source-documented",
            "proposed",
            "untested",
            "tested",
            "reviewed"
          ]
        },
        "source_url": {
          "type": "string"
        },
        "inspired_by": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string"
            },
            "author": {
              "type": "string"
            },
            "page": {
              "type": [
                "integer",
                "string"
              ]
            }
          },
          "additionalProperties": true
        },
        "notes": {
          "type": "string"
        }
      },
      "additionalProperties": true
    },
    "desired_outcomes": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "uniqueItems": true
    },
    "equipment": {
      "type": "object",
      "properties": {
        "preferred": {
          "$ref": "#/$defs/equipmentItem"
        },
        "alternatives": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/equipmentItem"
          }
        },
        "experimental": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/equipmentItem"
          }
        },
        "notes": {
          "type": "string"
        }
      },
      "additionalProperties": true
    },
    "testing_status": {
      "enum": [
        "proposed",
        "untested",
        "tested",
        "reviewed"
      ]
    },
    "variations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id"
        ],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
          },
          "name": {
            "type": "string"
          },
          "recipe_id": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "status": {
            "enum": [
              "proposed",
              "untested",
              "tested",
              "reviewed"
            ]
          }
        },
        "additionalProperties": true
      }
    },
    "dietary_information": {
      "type": "object",
      "properties": {
        "vegetarian": {
          "type": "boolean"
        },
        "vegan": {
          "type": "boolean"
        },
        "gluten_free": {
          "type": "boolean"
        },
        "allergens": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "notes": {
          "type": "string"
        }
      },
      "additionalProperties": true
    },
    "ingredients": {
      "type": "array",
      "minItems": 2,
      "items": {
        "$ref": "#/$defs/ingredient"
      }
    },
    "steps": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "science_notes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "history": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/historyEntry"
      }
    }
  },
  "additionalProperties": true,
  "$defs": {
    "equipmentItem": {
      "type": "object",
      "required": [
        "type"
      ],
      "properties": {
        "type": {
          "type": "string",
          "minLength": 1
        },
        "name": {
          "type": "string"
        },
        "base": {
          "type": "string"
        },
        "size_inches": {
          "type": "number",
          "exclusiveMinimum": 0
        },
        "oven_safe": {
          "type": "boolean"
        },
        "broiler_safe": {
          "type": "boolean"
        },
        "stovetop_safe": {
          "type": "boolean"
        },
        "notes": {
          "type": "string"
        }
      },
      "additionalProperties": true
    },
    "substitution": {
      "type": "object",
      "required": [
        "name",
        "ratio",
        "science_note"
      ],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "ratio": {
          "type": "number",
          "exclusiveMinimum": 0
        },
        "science_note": {
          "type": "string",
          "minLength": 1
        },
        "ww_points": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "uniqueItems": true
        },
        "evidence": {
          "type": "string"
        }
      },
      "additionalProperties": true
    },
    "ingredient": {
      "type": "object",
      "required": [
        "name",
        "qty_g",
        "vol_est",
        "function",
        "ww_points",
        "substitutions"
      ],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "qty_g": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0,
          "description": "Grams. null means quantity is unknown, not zero."
        },
        "vol_est": {
          "type": "string"
        },
        "function": {
          "type": "string"
        },
        "ww_points": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0
        },
        "substitutions": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/substitution"
          }
        },
        "no_scale": {
          "type": "boolean"
        },
        "optional": {
          "type": "boolean"
        },
        "estimated": {
          "type": "boolean"
        },
        "notes": {
          "type": "string"
        },
        "quantity_source": {
          "type": "object",
          "properties": {
            "original": {
              "type": "string"
            },
            "method": {
              "enum": [
                "explicit",
                "estimated_from_description",
                "unknown",
                "imported",
                "legacy"
              ]
            },
            "reviewed": {
              "type": "boolean"
            }
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": true
    },
    "historyEntry": {
      "type": "object",
      "properties": {
        "date": {
          "type": "string"
        },
        "note": {
          "type": "string"
        },
        "change": {
          "type": "string"
        },
        "rating": {
          "type": "number",
          "minimum": 0,
          "maximum": 5
        },
        "outcome": {
          "type": "string"
        },
        "variables_changed": {
          "type": "string"
        }
      },
      "additionalProperties": true
    }
  }
};
});
