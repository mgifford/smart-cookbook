function cookbookApp() {
  const queryParams = new URLSearchParams(window.location.search);
  // Check if debug mode is enabled via ?debug=true
  const debugMode = queryParams.get('debug') === 'true';
  // Optional deep link: index.html?recipe=<id>
  const requestedRecipeId = (queryParams.get('recipe') || '').trim();
  // Loaded by src/recipes/validation.js and src/generated/recipe-schema.js.
  const recipeValidation = typeof window !== 'undefined' ? window.RecipeValidation : null;
  const recipeSchema = typeof window !== 'undefined' ? window.SMART_COOKBOOK_RECIPE_SCHEMA : null;
  const runtimeConversions = typeof window !== 'undefined' ? window.SmartCookbookConversions : null;
  const bookmarkletSource = typeof window !== 'undefined' ? window.RecipeScraper : null;
  console.log('[DEBUG] Debug mode enabled:', debugMode);

  const clone = (obj) => {
    try {
      if (typeof structuredClone === 'function') return structuredClone(obj);
    } catch (_) {
      /* fall through to JSON clone */
    }
    return JSON.parse(JSON.stringify(obj));
  };

  const decodeEntities = (str) => {
    if (typeof str !== 'string') return str;
    if (typeof document === 'undefined') {
      return str.replace(/&#\d+;/g, (match) => String.fromCharCode(parseInt(match.slice(2, -1), 10)));
    }
    const el = document.createElement('textarea');
    el.innerHTML = str;
    return el.value;
  };

  const cleanIngredientName = (raw) => {
    const decoded = decodeEntities(raw || '')
      .replace(/½/g, '1/2').replace(/⅓/g, '1/3').replace(/⅔/g, '2/3')
      .replace(/¼/g, '1/4').replace(/¾/g, '3/4')
      .replace(/⅛/g, '1/8').replace(/⅜/g, '3/8').replace(/⅝/g, '5/8').replace(/⅞/g, '7/8')
      .trim();
    // Only strip a leading quantity (and its unit) when a number is actually
    // present. A word boundary on the unit prevents names such as "garlic",
    // "ground cinnamon", "large eggs", or "lime" from losing their first letter.
    const unit = '(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|pounds?|lbs?|grams?|kg|ml|millilit(?:er)?s?|lit(?:er)?s?|g|l|cloves?|cans?|pinch(?:es)?|sprigs?|bunch(?:es)?|slices?|sticks?)';
    const quantity = '\\d+(?:[.,]\\d+)?(?:\\s+\\d+\\/\\d+)?(?:\\/\\d+)?';
    const regex = new RegExp(`^\\s*${quantity}\\s*${unit}?\\b\\.?\\s*(?:of\\s+)?`, 'i');
    let cleaned = decoded.replace(regex, '').trim();
    // Drop a leading parenthetical weight, e.g. "(400 g) diced tomatoes".
    cleaned = cleaned.replace(/^\([^)]*\)\s*/, '').trim();
    return cleaned || decoded;
  };

  // Strip zero-width and exotic whitespace so ingredient names don't split (e.g., "l arge")
  const sanitizeText = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '') // zero-width + soft hyphen
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ') // unicode spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizeKey = (text) => {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  };

  const userLocale = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'en-US';

  const formatNumber = (value, { min = 0, max = 2 } = {}) => {
    if (!Number.isFinite(value)) return '';
    return new Intl.NumberFormat(userLocale, { minimumFractionDigits: min, maximumFractionDigits: max }).format(value);
  };

  // Extract weight in grams from ingredient name text (handles "4 pounds/1.8 kilograms", "8 tablespoons", etc.)
  const extractGramsFromIngredientName = (name) => {
    if (!name) return 0;
    const str = String(name).toLowerCase();
    
    // Try to extract explicit gram/kilogram values first (e.g., "1.8 kilograms", "450 grams")
    const gramMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:kilograms?|kg)/);
    if (gramMatch) return Math.round(parseFloat(gramMatch[1]) * 1000);
    
    const gramDirectMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:grams?|g(?!\s*[a-z]))/);
    if (gramDirectMatch) return Math.round(parseFloat(gramDirectMatch[1]));
    
    // Try pound/ounce conversions
    const poundMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?)/);
    if (poundMatch) return Math.round(parseFloat(poundMatch[1]) * 453.592);
    
    const ozMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:ounces?|oz)/);
    if (ozMatch) return Math.round(parseFloat(ozMatch[1]) * 28.3495);
    
    // Try volume conversions (tablespoons, cups, etc.)
    const tbspMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:tablespoons?|tbsp)/);
    if (tbspMatch) {
      const qty = parseFloat(tbspMatch[1]);
      // Estimate ~15ml = 15g for water-like liquids; ~15g for dry tbsp
      return Math.round(qty * 15);
    }
    
    const tspMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:teaspoons?|tsp)/);
    if (tspMatch) {
      const qty = parseFloat(tspMatch[1]);
      // ~5ml = 5g for liquids; ~5g for dry tsp
      return Math.round(qty * 5);
    }
    
    const cupMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:cups?|cup)/);
    if (cupMatch) {
      const qty = parseFloat(cupMatch[1]);
      // Default 240g per cup; will be refined by the Sous Chef
      return Math.round(qty * 240);
    }
    
    return 0;
  };

  const amountFromVolEst = (vol) => {
    if (!vol) return '';
    const re = /^\s*([0-9]+(?:[0-9.,\/\s]*[0-9])?)\s*(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce?s?|pounds?|lbs?|grams?|g|kg|ml|millilit(er)?s?|lit(er)?s?|l)?\b/i;
    const m = String(vol).match(re);
    if (m && m[1] && m[2]) {
      return `${m[1].trim()} ${m[2].trim()}`;
    }
    // Preserve descriptions such as "2 generous handfuls" rather than
    // manufacturing a unit from the first letter of a word.
    return vol;
  };

  const estimateGramsFromVolEst = (volEst, ingredientName) => {
    if (!volEst) return 0;
    const str = String(volEst).toLowerCase();
    // Allow mixed numbers like "1 1/2" or simple fractions/decimals
    const match = str.match(/^\s*([0-9]+(?:\s+[0-9]+\/[0-9]+|\/[0-9]+|\.[0-9]+)?)\s*(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?)/i);
    if (!match) return 0;
    
    const qty = parseMixedNumber(match[1]);
    if (!Number.isFinite(qty)) return 0;

    const unit = match[2].toLowerCase();
    const name = (ingredientName || '').toLowerCase();
    
    // Get density for this ingredient
    let gramsPerCup = densityPerCup[name] || 240;
    
    // Convert to grams based on unit
    if (unit.startsWith('cup')) {
      return Math.round(qty * gramsPerCup);
    } else if (unit.startsWith('tbsp') || unit.startsWith('tablespoon')) {
      return Math.round((qty / 16) * gramsPerCup);
    } else if (unit.startsWith('tsp') || unit.startsWith('teaspoon')) {
      return Math.round((qty / 48) * gramsPerCup);
    }
    
    return 0;
  };

  const autoEstimateQty = (volEst, ingredientName) => {
    const volClean = sanitizeText(volEst);
    const nameClean = sanitizeText(ingredientName).toLowerCase();
    // Pinch heuristic: per culinarylore guide ~1/16 tsp; table salt ≈0.36g
    if (/\bpinch\b/.test(volClean)) {
      if (nameClean.includes('salt')) return 0.36;
      return 0.2; // generic pinch fallback
    }
    let grams = estimateFromCan(volClean);
    if (!grams) grams = wholeUnitEstimate(volClean, nameClean);
    if (!grams) grams = smartEstimateGrams(volClean, nameClean);
    if (!grams) grams = estimateGramsFromVolEst(volClean, nameClean);
    return grams;
  };

  // Smart parser for "2 eggs", "1.5 cups flour", etc. from bookmarklet
  const smartEstimateGrams = (fullIngredientString, ingredientNameOnly) => {
    if (!fullIngredientString) return 0;
    const str = String(fullIngredientString).toLowerCase();
    const sizeHint = /large/.test(str) ? 'large' : /small/.test(str) ? 'small' : 'medium';
    
    // Try to extract number and unit at the start
    const match = str.match(/^\s*([0-9.\/]+)\s*(cups?|cup|tbsp|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce?s?|pounds?|lbs?|grams?|g|kg|eggs?|egg|bananas?|banana|apples?|apple|onions?|carrots?|cloves?|garlic|tomatoes?|peppers?|potatoes?|limes?|lemons?|oranges?|cans?)\b/i);
    
    if (!match) return 0;
    
    let qty = match[1];
    if (qty.includes('/')) {
      const parts = qty.split('/');
      qty = parseFloat(parts[0]) / parseFloat(parts[1] || 1);
    } else {
      qty = parseFloat(qty);
    }
    if (!Number.isFinite(qty)) return 0;
    
    const unit = match[2] ? match[2].toLowerCase() : '';
    const name = (ingredientNameOnly || '').toLowerCase();
    
    // Whole-unit conversions
    const wholeUnitFromBase = (base) => {
      if (!wholeUnitWeights[base]) return 0;
      const per = wholeUnitWeights[base][sizeHint] || wholeUnitWeights[base].default;
      return per ? Math.round(qty * per) : 0;
    };

    if (unit === 'egg' || unit === 'eggs') return wholeUnitFromBase('egg');
    if (unit === 'banana' || unit === 'bananas') return wholeUnitFromBase('banana');
    if (unit === 'apple' || unit === 'apples') return wholeUnitFromBase('apple');
    if (unit === 'onion' || unit === 'onions') return wholeUnitFromBase('onion');
    if (unit === 'carrot' || unit === 'carrots') return wholeUnitFromBase('carrot');
    if (unit === 'clove' || unit === 'cloves' || unit === 'garlic') return wholeUnitFromBase('garlic clove');
    if (unit === 'tomato' || unit === 'tomatoes') return wholeUnitFromBase('tomato');
    if (unit === 'pepper' || unit === 'peppers') return wholeUnitFromBase('bell pepper');
    if (unit === 'potato' || unit === 'potatoes') return wholeUnitFromBase('potato');
    if (unit === 'lime' || unit === 'limes') return wholeUnitFromBase('lime');
    if (unit === 'lemon' || unit === 'lemons') return wholeUnitFromBase('lemon');
    if (unit === 'orange' || unit === 'oranges') return wholeUnitFromBase('orange');
    if (unit === 'can' || unit === 'cans') return estimateFromCan(fullIngredientString);
    
    // Weight units
    if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') {
      return Math.round(qty * 28.3495);
    }
    if (unit === 'lb' || unit === 'lbs' || unit === 'pound' || unit === 'pounds') {
      return Math.round(qty * 453.592);
    }
    if (unit === 'g' || unit === 'grams') {
      return Math.round(qty);
    }
    if (unit === 'kg') {
      return Math.round(qty * 1000);
    }
    
    // Volume units
    let gramsPerCup = densityPerCup[name] || 240;
    if (unit.startsWith('cup')) {
      return Math.round(qty * gramsPerCup);
    } else if (unit.startsWith('tbsp') || unit.startsWith('tablespoon')) {
      return Math.round((qty / 16) * gramsPerCup);
    } else if (unit.startsWith('tsp') || unit.startsWith('teaspoon')) {
      return Math.round((qty / 48) * gramsPerCup);
    }
    
    return 0;
  };

  const convertTemperatureInText = (text, targetUnit) => {
    if (!text || !targetUnit) return text;
    
    // Match 175C, 350F, 180 degrees C, 350 degrees F, 400°F, etc.
    const tempRegex = /(\d+(?:\.\d+)?)\s*(°\s*|degrees?\s*)?(C|F|Celsius|Fahrenheit)\b/gi;

    return text.replace(tempRegex, (match, temp, degreeToken, unit) => {
      const tempNum = parseFloat(temp);
      const sourceUnit = unit.toUpperCase().charAt(0);
      const target = targetUnit.toUpperCase();

      if (sourceUnit === target) {
        // Already in target unit; preserve the author's original formatting.
        return match;
      }

      let converted;
      if (target === 'F' && sourceUnit === 'C') {
        converted = Math.round((tempNum * 9 / 5) + 32);
      } else if (target === 'C' && sourceUnit === 'F') {
        converted = Math.round((tempNum - 32) * 5 / 9);
      } else {
        return match;
      }

      const marker = degreeToken
        ? (degreeToken.includes('°') ? '°' : ' degrees ')
        : '';
      return `${converted}${marker}${target}`;
    });
  };

  // Lightweight extraction of temperature/time hints from steps (inspired by Cooklang tag approach)
  const extractStepSignals = (steps) => {
    let temp = null; // { value, unit }
    let maxTimeMin = null;
    if (!Array.isArray(steps)) return { temp, timeMinutes: maxTimeMin };

    const tempRegex = /(\d{2,3})\s*(?:°\s*)?(F|C|fahrenheit|celsius)/i;
    const timeRegex = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)(?![a-z])/i;

    for (const s of steps) {
      const str = String(s || '');
      const tMatch = str.match(tempRegex);
      if (tMatch) {
        const val = parseInt(tMatch[1], 10);
        const unit = tMatch[2].toUpperCase().startsWith('F') ? 'F' : 'C';
        if (!temp) temp = { value: val, unit };
      }
      const timeMatch = str.match(timeRegex);
      if (timeMatch) {
        const val = parseFloat(timeMatch[1]);
        const unitRaw = timeMatch[2].toLowerCase();
        const minutes = /h/.test(unitRaw) ? val * 60 : val;
        if (!maxTimeMin || minutes > maxTimeMin) maxTimeMin = minutes;
      }
    }
    return { temp, timeMinutes: maxTimeMin };
  };
  const sampleRecipes = [
    {
      id: 'banana-bread',
      _demo: true,
      meta: { name: 'Banana Bread', source: 'https://example.com/banana', base_servings: 8, prep_time: '15 min' },
      ingredients: [
        { name: 'all-purpose flour', qty_g: 250, vol_est: '2 cups', function: 'structure', ww_points: 24,
          substitutions: [{ name: 'whole wheat flour', ratio: 1.0, science_note: 'More bran; add 10g water', ww_points: 23, tags: ['ww'] }] },
        { name: 'ripe banana', qty_g: 300, vol_est: '3 medium', function: 'moisture', ww_points: 12, substitutions: [] },
        { name: 'butter', qty_g: 100, vol_est: '7 tbsp', function: 'fat', ww_points: 30,
          substitutions: [
            { name: 'greek yogurt', ratio: 0.75, science_note: 'More water; add 10g flour', ww_points: 10, tags: ['ww'] },
            { name: 'coconut oil', ratio: 1.0, science_note: 'Plant fat replaces dairy; same richness', ww_points: 30, tags: ['veg'] }
          ] },
        { name: 'brown sugar', qty_g: 150, vol_est: '3/4 cup', function: 'flavor', ww_points: 24, substitutions: [] },
        { name: 'baking soda', qty_g: 5, vol_est: '1 tsp', function: 'leavening', ww_points: 0, substitutions: [] }
      ],
      steps: [
        'Preheat oven to 175C and grease pan.',
        'Mash bananas with sugar, then whisk in melted butter.',
        'Fold in dry ingredients until just combined.',
        'Bake 50-55 minutes; cool before slicing.'
      ],
      science_notes: [
        'Overripe bananas have more simple sugars (starches converted), creating sweeter flavor and better caramelization',
        'Baking soda reacts with acidic bananas to produce CO₂ gas, creating rise and tender crumb',
        'At 175C, Maillard reaction browns the crust, creating complex nutty flavors and aromas',
        'Folding (not beating) prevents gluten overdevelopment, keeping the texture tender'
      ],
      history: []
    }
  ];

  // ORF export: map internal recipe → Open Recipe Format (with extensions for our science fields)
  const toOrf = (recipe) => {
    const r = recipe || {};
    const ingredients = (r.ingredients || []).map(ing => ({
      item: ing.name,
      quantity: Number.isFinite(ing.qty_g) ? Number(ing.qty_g) : null,
      unit: Number.isFinite(ing.qty_g) ? 'g' : null,
      volume: ing.vol_est || null,
      notes: ing.function || '',
      substitutions: (ing.substitutions || []).map(sub => ({
        item: sub.name,
        ratio: sub.ratio,
        notes: sub.science_note,
        ww_points: sub.ww_points ?? null,
        tags: sub.tags
      })),
      extensions: {
        x_qty_g: Number.isFinite(ing.qty_g) ? Number(ing.qty_g) : null,
        x_vol_est: ing.vol_est || null,
        x_function: ing.function || null,
        x_ww_points: ing.ww_points ?? null,
        x_substitutions: ing.substitutions || []
      }
    }));

    return {
      open_recipe_format_version: '0.5',
      recipe: {
        name: r.meta?.name || 'Untitled Recipe',
        source: r.meta?.source || '',
        yield: { amount: r.meta?.base_servings || 1, unit: 'servings' },
        prep_time: r.meta?.prep_time || '',
        ingredients,
        instructions: r.steps || [],
        extras: {
          science_notes: r.science_notes || [],
          history: r.history || [],
          ww_points: r.meta?.ww_points ?? null
        }
      }
    };
  };

  // ORF import: map ORF object → internal recipe shape (best-effort, keeps extensions when present)
  const fromOrf = (data) => {
    const r = data?.recipe || data;
    if (!r) throw new Error('ORF data missing recipe field');

    const ingredients = (r.ingredients || []).map(ing => {
      const ext = ing.extensions || ing.extras || {};
      const unit = (ing.unit || '').toString().toLowerCase();
      const qtyRaw = ing.quantity;
      let qtyG = Number(ext.x_qty_g);
      if (!Number.isFinite(qtyG)) {
        const numeric = Number(qtyRaw);
        if (Number.isFinite(numeric)) {
          if (unit === 'g' || unit === 'gram' || unit === 'grams') qtyG = numeric;
          else if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') qtyG = numeric * 1000;
        }
      }
      const volEst = ext.x_vol_est || ing.volume || ((ing.unit || ing.quantity) ? `${ing.quantity ?? ''} ${ing.unit ?? ''}`.trim() : '');
      const wwSource = ext.x_ww_points ?? ing.ww_points;
      const wwPoints = wwSource === null || wwSource === undefined || wwSource === '' ? null : Number(wwSource);
      const hasQty = Number.isFinite(qtyG);
      const quantitySource = ext.x_quantity_source && typeof ext.x_quantity_source === 'object'
        ? ext.x_quantity_source
        : {
            original: sanitizeText(volEst || ''),
            method: hasQty ? 'explicit' : 'unknown',
            reviewed: false
          };
      return {
        name: sanitizeText(ing.item || ing.name || 'ingredient'),
        qty_g: hasQty ? qtyG : null,
        vol_est: sanitizeText(volEst || ''),
        function: ext.x_function || ing.function || ing.notes || '',
        ww_points: Number.isFinite(wwPoints) ? wwPoints : null,
        estimated: ext.x_estimated === true,
        quantity_source: quantitySource,
        substitutions: (ext.x_substitutions || ing.substitutions || []).map(sub => {
          const rawWw = sub.ww_points;
          const subWw = rawWw === null || rawWw === undefined || rawWw === '' ? null : Number(rawWw);
          return {
            name: sub.item || sub.name || '',
            ratio: sub.ratio || 1,
            science_note: sub.science_note || sub.notes || '',
            ww_points: Number.isFinite(subWw) ? subWw : null,
            tags: sub.tags || []
          };
        })
      };
    });

    return {
      meta: {
        name: r.name || 'Imported Recipe',
        source: r.source || '',
        base_servings: Number(r.yield?.amount || r.yield || 1) || 1,
        prep_time: r.prep_time || ''
      },
      ingredients,
      steps: r.instructions || r.directions || [],
      science_notes: (r.extras && r.extras.science_notes) || r.science_notes || [],
      history: (r.extras && r.extras.history) || r.history || []
    };
  };

  // Authored in conversions.yaml; generated into src/generated/conversions.js.
  const densityPerCup = runtimeConversions?.densitiesPerCup || {};

  const ounceToGrams = 28.3495;

  const roundToStep = (value, step, min = 0) => {
    if (!Number.isFinite(value)) return 0;
    const rounded = Math.round(value / step) * step;
    return rounded < min ? min : rounded;
  };

  const trimZeros = (str) => String(str).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');

  const toFractionQuarter = (val) => {
    const rounded = Math.round(val * 4) / 4;
    const whole = Math.floor(rounded);
    const frac = +(rounded - whole).toFixed(2);
    const map = { 0: '', 0.25: '1/4', 0.5: '1/2', 0.75: '3/4' };
    const fracStr = frac in map ? map[frac] : trimZeros(rounded.toFixed(2));
    if (whole > 0 && fracStr) return `${whole} ${fracStr}`;
    if (whole > 0) return `${whole}`;
    return fracStr || '0';
  };

  const packagedUnitWeights = runtimeConversions?.packagedUnitWeights || {};

  const wholeUnitWeights = runtimeConversions?.wholeUnitWeights || {};

  const parseMixedNumber = (token) => {
    if (!token) return NaN;
    const trimmed = String(token).trim();
    const mixed = trimmed.match(/^([0-9]+)\s+([0-9]+)\/([0-9]+)$/);
    if (mixed) {
      const whole = parseFloat(mixed[1]);
      const num = parseFloat(mixed[2]);
      const den = parseFloat(mixed[3]);
      if (den === 0) return NaN;
      return whole + num / den;
    }
    const frac = trimmed.match(/^([0-9]+)\/([0-9]+)$/);
    if (frac) {
      const num = parseFloat(frac[1]);
      const den = parseFloat(frac[2]);
      if (den === 0) return NaN;
      return num / den;
    }
    const num = parseFloat(trimmed.replace(/,/g, '.'));
    return Number.isFinite(num) ? num : NaN;
  };

  const resolveWholeUnitKey = (volEst, ingredientName) => {
    const haystack = `${volEst || ''} ${ingredientName || ''}`.toLowerCase();
    // Processed forms are not whole items: garlic bread is not a garlic clove,
    // garlic powder is not a clove, tomato sauce is not a tomato, and so on.
    if (/\b(powder|ground|dried|bread|sauce|paste|juice|zest|confit|oil)\b/i.test(haystack)) return null;
    const candidates = [
      { key: 'garlic clove', tokens: ['garlic clove', 'garlic'] },
      { key: 'onion', tokens: ['onion'] },
      { key: 'carrot', tokens: ['carrot'] },
      { key: 'egg', tokens: ['egg'] },
      { key: 'banana', tokens: ['banana'] },
      { key: 'apple', tokens: ['apple'] },
      { key: 'tomato', tokens: ['tomato'] },
      { key: 'bell pepper', tokens: ['bell pepper', 'pepper'] },
      { key: 'potato', tokens: ['potato'] },
      { key: 'lime', tokens: ['lime'] },
      { key: 'lemon', tokens: ['lemon'] },
      { key: 'orange', tokens: ['orange'] },
      { key: 'cilantro bunch', tokens: ['cilantro', 'coriander', 'bunch'] },
      { key: 'cinnamon stick', tokens: ['cinnamon stick', 'cinnamon'] }
    ];
    for (const candidate of candidates) {
      if (candidate.tokens.some(tok => haystack.includes(tok))) {
        return candidate.key;
      }
    }
    return null;
  };

  const wholeUnitEstimate = (volEst, ingredientName) => {
    const countMatch = String(volEst || '').match(/^\s*([0-9]+(?:\s+[0-9]+\/[0-9]+|\/[0-9]+)?)/);
    const count = parseMixedNumber(countMatch ? countMatch[1] : '');
    if (!Number.isFinite(count) || count <= 0) return 0;
    const size = /large/i.test(volEst || '') ? 'large' : /small/i.test(volEst || '') ? 'small' : 'medium';
    const key = resolveWholeUnitKey(volEst, ingredientName);
    if (!key || !wholeUnitWeights[key]) return 0;
    const weights = wholeUnitWeights[key];
    const per = weights[size] || weights.default;
    return per ? Math.round(count * per) : 0;
  };

  const estimateFromCan = (volEst) => {
    const text = String(volEst || '').toLowerCase();
    if (!text.includes('can')) return 0;
    const m = text.match(/([0-9]+(?:\s+[0-9]+\/[0-9]+|\/[0-9]+|\.[0-9]+)?)\s*(?:-|\s)?(?:ounce|oz)/i);
    if (!m) return 0;
    const ounces = parseMixedNumber(m[1]);
    if (!Number.isFinite(ounces) || ounces <= 0) return 0;
    const grams = Math.round(ounces * ounceToGrams);
    const snap = Object.values(packagedUnitWeights).find(val => Math.abs(val - grams) <= 5);
    return snap || grams;
  };

  // Display preferences for common ingredients (volume units preferred over grams)
  const ingredientDisplayPrefs = runtimeConversions?.displayPrefs || {};

  // Aliases resolve to a canonical key in ingredientDisplayPrefs
  const ingredientAliasMap = runtimeConversions?.aliases || {};

  const volumeFirst = new Set(runtimeConversions?.volumeFirst || []);

  const getDisplayPref = (ingName) => {
    const lower = (ingName || '').toLowerCase();
    if (ingredientDisplayPrefs[lower]) return ingredientDisplayPrefs[lower];
    const aliasTarget = ingredientAliasMap[lower];
    if (aliasTarget && ingredientDisplayPrefs[aliasTarget]) return ingredientDisplayPrefs[aliasTarget];
    return null;
  };

  const prefersVolume = (ingName) => {
    const key = normalizeKey(ingName || '');
    if (volumeFirst.has(key)) return true;
    const aliasTarget = ingredientAliasMap[key] || ingredientAliasMap[ingName?.toLowerCase()];
    if (aliasTarget && volumeFirst.has(normalizeKey(aliasTarget))) return true;
    return false;
  };

  const nutritionMap = {};
  const missingNutritionWarned = new Set();
  const meatSubsMap = {}; // normalizeKey(base) -> array of options

  const loadNutritionData = async () => {
    try {
      const res = await fetch('nutrition.yaml');
      if (!res.ok) throw new Error('nutrition fetch failed');
      const text = await res.text();
      const parsed = jsyaml.load(text);
      if (!Array.isArray(parsed)) throw new Error('nutrition format invalid');
      parsed.forEach(item => {
        const key = normalizeKey(item.name || item.id || '');
        if (!key) return;
        nutritionMap[key] = {
          calories: Number(item.calories_kcal) || 0,
          protein: Number(item.protein_g) || 0,
          fat: Number(item.fat_g) || 0,
          carbs: Number(item.carbs_g) || 0,
          fiber: Number(item.fiber_g) || 0
        };
      });
      if (Object.keys(nutritionMap).length === 0) throw new Error('nutrition map empty');
      return true; // Success
    } catch (err) {
      console.error('[ERROR] Nutrition load failed:', err);
      return false; // Failure
    }
  };

  let glossaryMap = {}; // Maps name variations → canonical names

  const loadGlossary = async () => {
    try {
      const res = await fetch('ingredients-glossary.yaml');
      if (!res.ok) throw new Error('glossary fetch failed');
      const text = await res.text();
      const parsed = jsyaml.load(text);
      if (parsed && parsed.glossary && Array.isArray(parsed.glossary)) {
        parsed.glossary.forEach(entry => {
          if (entry.names && entry.canonical) {
            entry.names.forEach(name => {
              glossaryMap[normalizeKey(name)] = normalizeKey(entry.canonical);
            });
          }
        });
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  const loadMeatSubs = async () => {
    try {
      const res = await fetch('meat-substitutions.yaml');
      if (!res.ok) throw new Error('meat substitutions fetch failed');
      const text = await res.text();
      const parsed = jsyaml.load(text);
      const subs = parsed?.substitutions || [];
      subs.forEach(entry => {
        const bases = [entry.base, ...(entry.aliases || [])];
        bases.forEach(b => {
          const key = normalizeKey(b || '');
          if (!key) return;
          meatSubsMap[key] = entry.options || [];
        });
      });
      return true;
    } catch (err) {
      console.warn('[WARN] meat-substitutions load failed:', err?.message || err);
      return false;
    }
  };

  const ingredientNutrition = (name, grams) => {
    const key = normalizeKey(name);
    // Check glossary first to map name variation → canonical name
    const canonicalKey = glossaryMap[key] || key;
    let entry = nutritionMap[canonicalKey];

    // Fallback: try alias chain for display prefs
    if (!entry) {
      const aliasTarget = ingredientAliasMap[canonicalKey];
      if (aliasTarget) entry = nutritionMap[normalizeKey(aliasTarget)];
    }

    // Last resort: substring search over nutrition keys
    if (!entry && canonicalKey) {
      const foundKey = Object.keys(nutritionMap).find(k => canonicalKey.includes(k));
      if (foundKey) entry = nutritionMap[foundKey];
    }

    if (!entry || !grams || grams <= 0) {
      if (!entry) {
        const keyToWarn = canonicalKey || '(empty)';
        if (!missingNutritionWarned.has(keyToWarn)) {
          console.warn('[WARN] No nutrition entry for', keyToWarn, 'from', name);
          missingNutritionWarned.add(keyToWarn);
        }
      }
      return null;
    }
    const factor = grams / 100;
    return {
      calories: Math.round(entry.calories * factor),
      protein: +(entry.protein * factor).toFixed(1),
      fat: +(entry.fat * factor).toFixed(1),
      carbs: +(entry.carbs * factor).toFixed(1),
      fiber: +(entry.fiber * factor).toFixed(1)
    };
  };

  // Region-aware defaults for user display preferences
  const regionDefaults = {
    US: { weightUnit: 'oz', volumeUnit: 'cups', tempUnit: 'F' },
    CA: { weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' },
    GB: { weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' },
    UK: { weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' },
    AU: { weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' },
    NZ: { weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' },
    EU: { weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' },
    DEFAULT: { weightUnit: 'g', volumeUnit: 'ml', tempUnit: 'C' }
  };

  const detectRegion = () => {
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : {};
      const langTag = (nav.languages && nav.languages[0]) || nav.language || '';
      const locale = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().locale : '';
      const tag = (langTag || locale || '').toUpperCase();
      const parts = tag.split(/[-_]/);
      const region = parts[1] || parts[0];
      if (region && region.length === 2) return region;

      const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '';
      if (/^EUROPE\//i.test(tz)) return 'EU';
    } catch (_) {
      /* fall through */
    }
    return 'DEFAULT';
  };

  const resolvedDefaultPrefs = () => {
    const region = detectRegion();
    return {
      ...(regionDefaults[region] || regionDefaults.EU),
      system: 'auto'
    };
  };

  // Local persistence for prefs
  const loadPrefs = () => {
    try {
      const raw = localStorage.getItem('cookbook-prefs');
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed) return null;
      // Backfill missing fields for older saves
      if (!parsed.system) parsed.system = 'auto';
      if (!parsed.weightUnit) parsed.weightUnit = resolvedDefaultPrefs().weightUnit;
      if (!parsed.volumeUnit) parsed.volumeUnit = resolvedDefaultPrefs().volumeUnit;
      if (!parsed.tempUnit) parsed.tempUnit = resolvedDefaultPrefs().tempUnit;
      return parsed;
    } catch (_) {
      return null;
    }
  };

  // Repository recipes removed by the user are remembered so bootstrap does
  // not silently restore them on reload. Clearing localStorage resets this.
  const DELETED_RECIPES_KEY = 'cookbook-deleted-recipes';
  const loadDeletedRecipeIds = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(DELETED_RECIPES_KEY) || '[]');
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (_) {
      return new Set();
    }
  };
  const saveDeletedRecipeIds = (ids) => {
    try {
      localStorage.setItem(DELETED_RECIPES_KEY, JSON.stringify([...ids]));
    } catch (_) {
      /* storage may be unavailable or full; deletion still applies in memory */
    }
  };
  const deletedRecipeIds = loadDeletedRecipeIds();

  const EXPERIMENTS_KEY = 'cookbook-experiments';
  const loadExperimentsFromStorage = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(EXPERIMENTS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object' && item.id && item.recipe_id) : [];
    } catch (_) {
      return [];
    }
  };
  const saveExperimentsToStorage = (experiments) => {
    try {
      localStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(experiments));
      return true;
    } catch (_) {
      return false;
    }
  };
  const localToday = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const hashString = (value) => {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  };

  const SELECTED_RECIPE_KEY = 'cookbook-selected-recipe';
  const loadSelectedRecipeId = () => {
    try {
      return localStorage.getItem(SELECTED_RECIPE_KEY) || '';
    } catch (_) {
      return '';
    }
  };
  const saveSelectedRecipeId = (id) => {
    try {
      if (id) localStorage.setItem(SELECTED_RECIPE_KEY, id);
      else localStorage.removeItem(SELECTED_RECIPE_KEY);
    } catch (_) {
      /* selection persistence is best-effort */
    }
  };

  // Load recipes from localStorage
  const loadRecipesFromStorage = () => {
    try {
      const raw = localStorage.getItem('cookbook-recipes');
      if (raw) {
        const stored = JSON.parse(raw);
        return Array.isArray(stored) && stored.length > 0 ? stored : sampleRecipes;
      }
    } catch (_) {
      return sampleRecipes;
    }
    return sampleRecipes;
  };

  // Fetch the lightweight recipe index (recipes.json) generated at build time
  const fetchRecipeIndex = async () => {
    try {
      const res = await fetch('recipes.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`recipes.json ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ERROR] Failed to load recipe index:', err);
      return null;
    }
  };

  // Fetch a single recipe YAML by id
  const fetchRecipeYaml = async (id) => {
    if (!id) return null;
    try {
      const res = await fetch(`recipes/${id}.yaml`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`recipes/${id}.yaml ${res.status}`);
      const yamlText = await res.text();
      const parsed = jsyaml.load(yamlText) || {};
      // Preserve every top-level field, including future optional metadata.
      return {
        ...parsed,
        id,
        meta: parsed.meta || { name: id, source: '', base_servings: 1, prep_time: '' },
        ingredients: parsed.ingredients || [],
        steps: parsed.steps || [],
        science_notes: Array.isArray(parsed.science_notes) ? parsed.science_notes : [],
        history: parsed.history || []
      };
    } catch (err) {
      console.error(`[ERROR] Failed to load recipe ${id}:`, err);
      return null;
    }
  };

  // Create a placeholder recipe entry from index metadata so it can appear in the selector
  const placeholderFromIndex = (entry) => ({
    id: entry.id,
    meta: {
      name: entry.name || entry.id,
      source: entry.source || '',
      base_servings: entry.servings || 1,
      prep_time: entry.prep_time || ''
    },
    ingredients: [],
    steps: [],
    science_notes: [],
    history: [],
    _placeholder: true
  });

  const defaultPrefs = resolvedDefaultPrefs();
  const initialRecipes = loadRecipesFromStorage();
  
  // Ensure we have at least one recipe
  console.log('[DEBUG] loadRecipesFromStorage returned:', initialRecipes);
  console.log('[DEBUG] sampleRecipes:', sampleRecipes);
  const recipesToUse = (Array.isArray(initialRecipes) && initialRecipes.length > 0) ? initialRecipes : sampleRecipes;
  const firstRecipe = recipesToUse[0] || { id: 'empty', meta: { name: 'No Recipe', source: '', base_servings: 1 }, ingredients: [], steps: [], science_notes: [] };
  const storedSelectedId = loadSelectedRecipeId();
  const initialSelectedId = requestedRecipeId
    || (storedSelectedId && !deletedRecipeIds.has(storedSelectedId) ? storedSelectedId : '')
    || firstRecipe.id;
  const initialRecipe = recipesToUse.find(r => r.id === initialSelectedId) || firstRecipe;
  const initialShowHome = !requestedRecipeId;
  let nutritionCache = { key: null, value: null };

  return {
    debugMode,
    loadingIndex: false,
    loadingRecipeId: null,
    indexError: null,
    nutritionLoaded: false,
    nutritionError: null,
    nutritionVersion: 0,
    importErrors: [],
    importWarnings: [],
    showHome: initialShowHome,
    homeNotice: '',
    lastRecipeId: storedSelectedId && !deletedRecipeIds.has(storedSelectedId) ? storedSelectedId : '',
    shareStatus: '',
    shareFallback: '',
    experiments: loadExperimentsFromStorage(),
    experimentJson: '',
    experimentStatus: '',
    experimentSaved: false,
    editingExperimentId: null,
    comparisonAId: '',
    comparisonBId: '',
    experimentForm: {
      date: localToday(),
      recipe_id: '',
      variation_id: 'weeknight',
      recipe_revision: '',
      equipment: {
        pan_type: '',
        pan_size_inches: '',
        surface: '',
        stovetop_pre_sear: false,
        oven_temperature_c: '',
        baking_minutes: '',
        broiler_used: false
      },
      ingredient_changes: '',
      observations: {
        top_crispness: '',
        bottom_crispness: '',
        mushroom_intensity: '',
        creaminess: '',
        sticking: '',
        cleaning_difficulty: '',
        ease_of_serving: ''
      },
      actual_elapsed_minutes: '',
      cost_cad: '',
      notes: ''
    },
      stepSignals: { temp: null, timeMinutes: null },
    async init() {
      console.log('[DEBUG] init() called');
      if (typeof window !== 'undefined' && !this._historyBound) {
        this._historyBound = true;
        window.addEventListener('popstate', () => this.handleLocationChange());
        window.addEventListener('hashchange', () => {
          if (!this.showHome) this.restoreHashTarget();
        });
      }
      console.log('[DEBUG] recipes array:', this.recipes);
      console.log('[DEBUG] selectedId:', this.selectedId);
      console.log('[DEBUG] current:', this.current);
      this.bootstrapRecipes();
      loadGlossary().then((glossSuccess) => {
        if (glossSuccess) console.log('[DEBUG] Glossary loaded');
        return loadMeatSubs();
      }).then(() => {
        return loadNutritionData();
      }).then((success) => {
        if (success) {
          this.nutritionLoaded = true;
          this.nutritionVersion += 1;
          console.log('[DEBUG] Nutrition loaded');
        } else {
          this.nutritionError = true;
          console.log('[DEBUG] Nutrition failed to load');
        }
        // update step signals after async loads complete
        this.stepSignals = extractStepSignals(this.current.steps || []);
      });
    },

    async bootstrapRecipes() {
      this.loadingIndex = true;
      try {
        const index = await fetchRecipeIndex();
        if (!index || !Array.isArray(index.recipes)) {
          this.indexError = 'Recipe index missing or invalid';
          return;
        }
        this.indexError = null;

        const existingIds = new Set(this.recipes.map(r => r.id));
        index.recipes.forEach(entry => {
          if (!existingIds.has(entry.id) && !deletedRecipeIds.has(entry.id)) {
            this.recipes.push(placeholderFromIndex(entry));
          }
        });

        // Keep selector stable and alphabetized
        this.recipes.sort((a, b) => (a.meta?.name || a.id).localeCompare(b.meta?.name || b.id));

        const stored = loadSelectedRecipeId();
        const storedIsValid = stored
          && !deletedRecipeIds.has(stored)
          && this.recipes.some(r => r.id === stored);

        if (requestedRecipeId) {
          const requestedIsValid = !deletedRecipeIds.has(requestedRecipeId)
            && this.recipes.some(r => r.id === requestedRecipeId);
          if (requestedIsValid) {
            this.showHome = false;
            this.selectedId = requestedRecipeId;
            await this.loadRecipe(requestedRecipeId, { skipUrl: true });
          } else {
            // A stale shared link should land on the library with an explanation,
            // not silently open an unrelated recipe.
            this.showHome = true;
            this.homeNotice = 'That recipe link no longer points to a recipe in this cookbook.';
            this.selectedId = storedIsValid ? stored : (this.recipes[0]?.id || '');
            this.cleanRecipeUrl();
          }
        } else {
          // The root URL is the shareable home page. A stored selection is a
          // convenience for the "last recipe" link, not an automatic redirect.
          this.showHome = true;
          this.selectedId = storedIsValid ? stored : (this.recipes[0]?.id || '');
          this.lastRecipeId = storedIsValid ? stored : '';
          document.title = 'Science-Based Smart Cookbook';
        }
      } catch (err) {
        console.error('[ERROR] bootstrapRecipes failed:', err);
        this.indexError = err.message;
      } finally {
        this.loadingIndex = false;
      }
    },
    recipes: recipesToUse,
    selectedId: initialSelectedId,
    current: clone(initialRecipe),
    _historyBound: false,
    servings: initialRecipe.meta?.base_servings || 1,
    hasUnsavedChanges: false,
    wwMode: true,
    dietMode: 'none',
    scienceMode: true,
    precisionMode: false,
    showCopyright: false,
    yamlText: '',
    bookmarkletCode: bookmarkletSource ? bookmarkletSource.buildBookmarkletCode() : '',
    prefs: loadPrefs() || defaultPrefs,

    async loadRecipe(id = this.selectedId, opts = {}) {
      const recipeId = id || this.selectedId;
      if (!recipeId) return;

      this.selectedId = recipeId;
      this.showHome = false;
      this.homeNotice = '';
      this.lastRecipeId = recipeId;
      this.shareStatus = '';
      this.shareFallback = '';
      saveSelectedRecipeId(recipeId);
      if (!opts.skipUrl && typeof window !== 'undefined' && window.history) {
        const url = new URL(window.location.href);
        url.searchParams.set('recipe', recipeId);
        if (opts.pushHistory) url.hash = '';
        const method = opts.pushHistory ? 'pushState' : 'replaceState';
        window.history[method]({ recipeId }, '', url);
      }
      this.loadingRecipeId = recipeId;

      try {
        let recipe = this.recipes.find(r => r.id === recipeId);
        console.log('[DEBUG] loadRecipe() called, recipeId:', recipeId);
        console.log('[DEBUG] found recipe:', recipe);

        const needsFetch = !recipe || recipe._placeholder || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0 || !Array.isArray(recipe.steps) || recipe.steps.length === 0;

        if (needsFetch) {
          const fetched = await fetchRecipeYaml(recipeId);
          if (fetched) {
            fetched._placeholder = false;
            const idx = this.recipes.findIndex(r => r.id === recipeId);
            if (idx >= 0) this.recipes.splice(idx, 1, fetched);
            else this.recipes.push(fetched);
            recipe = fetched;
            if (!opts.skipPersist) this.persistRecipes();
          } else if (!recipe) {
            console.warn('[WARN] Recipe fetch failed and no local copy available.');
            return;
          }
        }

        if (recipe) {
          this.current = clone(recipe);
          this.servings = recipe.meta?.base_servings || 1;
          console.log('[DEBUG] current after clone:', this.current);
          console.log('[DEBUG] current.ingredients length:', this.current.ingredients?.length);
          console.log('[DEBUG] current.steps length:', this.current.steps?.length);
          this.stepSignals = extractStepSignals(this.current.steps || []);
          this.prepareExperimentForm();
          document.title = `${this.current.meta?.name || 'Recipe'} — Science-Based Smart Cookbook`;
          this.afterRender(() => this.restoreHashTarget());
        }
      } finally {
        this.loadingRecipeId = null;
      }
    },

    persistPrefs() {
      try { localStorage.setItem('cookbook-prefs', JSON.stringify(this.prefs)); } catch (_) {}
    },

    persistRecipes() {
      try { localStorage.setItem('cookbook-recipes', JSON.stringify(this.recipes)); } catch (_) {}
    },

    slugify(name) {
      return (name || 'recipe').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `recipe-${Date.now()}`;
    },

    setSystem(system) {
      const choice = system || 'auto';
      const defaults = resolvedDefaultPrefs();
      this.prefs.system = choice;
      if (choice === 'metric') {
        this.prefs.weightUnit = 'g';
        this.prefs.volumeUnit = 'ml';
        this.prefs.tempUnit = 'C';
      } else if (choice === 'imperial') {
        this.prefs.weightUnit = 'oz';
        this.prefs.volumeUnit = 'cups';
        this.prefs.tempUnit = 'F';
      } else { // auto/best-fit
        this.prefs.weightUnit = defaults.weightUnit;
        this.prefs.volumeUnit = defaults.volumeUnit;
        this.prefs.tempUnit = defaults.tempUnit;
      }
      this.persistPrefs();
    },

    upsertRecipe(recipe) {
      // An explicit import of an id revives a previously deleted library entry.
      if (deletedRecipeIds.has(recipe.id)) {
        deletedRecipeIds.delete(recipe.id);
        saveDeletedRecipeIds(deletedRecipeIds);
      }
      const idx = this.recipes.findIndex(r => r.id === recipe.id);
      if (idx >= 0) this.recipes.splice(idx, 1, recipe);
      else this.recipes.push(recipe);
      this.persistRecipes();
    },

    loadYaml() {
      try {
        const parsed = jsyaml.load(this.yamlText);
        console.log('Parsed YAML:', parsed);
        if (!parsed || typeof parsed !== 'object' || !parsed.meta || !parsed.ingredients) {
          this.importErrors = [{
            path: '(root)',
            message: 'YAML must contain both a meta mapping and an ingredients list.'
          }];
          this.importWarnings = [];
          setTimeout(() => {
            const panel = document.getElementById('import-errors');
            if (panel) panel.focus();
          }, 0);
          return;
        }
        
        // Helper to remove all invisible/problematic Unicode characters
        const cleanUnicode = (str) => {
          if (!str) return str;
          return String(str)
            // Remove zero-width and invisible characters
            .replace(/[\u200B\u200C\u200D\u2060]/g, '')
            // Remove soft hyphens and other format characters
            .replace(/[\u00AD\u061C\u180E]/g, '')
            // Replace other Unicode spaces with regular space
            .replace(/[\u0085\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
            // Collapse multiple spaces
            .replace(/ +/g, ' ')
            .trim();
        };
        
        // Normalize meta fields
        parsed.meta.name = cleanUnicode(decodeEntities(parsed.meta.name || ''));
        if (parsed.meta && typeof parsed.meta.source === 'object') parsed.meta.source = parsed.meta.source.url || parsed.meta.source['@id'] || '';
        if (parsed.meta && typeof parsed.meta.source !== 'string') parsed.meta.source = '';
        // Normalize base_servings only when a positive number can be read.
        // Invalid values remain invalid so the shared validator can report them.
        const rawBase = parsed.meta.base_servings;
        const baseMatch = String(rawBase ?? '').match(/\d+(?:\.\d+)?/);
        if (baseMatch && Number(baseMatch[0]) > 0) {
          parsed.meta.base_servings = Number(baseMatch[0]);
        } else {
          parsed.meta.base_servings = rawBase;
        }

        // Normalize ingredients. Never deduplicate by name: the same ingredient
        // may legitimately appear twice for different purposes/components.
        const invalidQuantities = [];
        parsed.ingredients = (parsed.ingredients || []).map(ing => {
          const rawName = cleanUnicode(ing.name || '');
          const cleanedName = cleanIngredientName(rawName);
          const volEstClean = cleanUnicode(ing.vol_est || '');
          const rawQty = typeof ing.qty_g === 'string' && ing.qty_g.trim() !== ''
            ? Number(ing.qty_g)
            : ing.qty_g;
          const invalidQty = rawQty !== null && rawQty !== undefined && rawQty !== ''
            && !(typeof rawQty === 'number' && Number.isFinite(rawQty) && rawQty >= 0);
          if (invalidQty) invalidQuantities.push(cleanedName || `ingredient ${parsed.ingredients.indexOf(ing) + 1}`);
          const hasExplicitQty = typeof rawQty === 'number' && Number.isFinite(rawQty) && rawQty >= 0;
          let qty = hasExplicitQty ? rawQty : null;
          let estimated = false;
          let method = hasExplicitQty ? 'explicit' : 'unknown';

          if (!hasExplicitQty) {
            const estimate = autoEstimateQty(volEstClean, cleanedName);
            if (estimate > 0) {
              qty = estimate;
              estimated = true;
              method = 'estimated_from_description';
            }
          }

          const source = ing.quantity_source && typeof ing.quantity_source === 'object'
            ? ing.quantity_source
            : {};

          return {
            ...ing,
            name: cleanedName,
            qty_g: qty,
            vol_est: volEstClean,
            estimated,
            quantity_source: {
              ...source,
              original: source.original ?? (volEstClean || cleanedName),
              method: source.method || method,
              reviewed: source.reviewed === true
            },
            function: ing.function || '',
            // Preserve null (not calculated) and 0 (explicitly zero) exactly.
            ww_points: ing.ww_points === undefined ? null : ing.ww_points,
            substitutions: ing.substitutions || []
          };
        });

        const unknownQuantities = parsed.ingredients.filter(ing => ing.qty_g === null).map(ing => ing.name);
        const estimatedQuantities = parsed.ingredients.filter(ing => ing.estimated).map(ing => `${ing.name} (${Math.round(ing.qty_g)}g estimated)`);
        if (unknownQuantities.length > 0) {
          console.info('[INFO] Unknown quantities:', unknownQuantities);
        }
        if (estimatedQuantities.length > 0) {
          console.info('[INFO] Estimated qty_g for:', estimatedQuantities);
        }

        // Normalize steps (ensure strings and decode entities)
        parsed.steps = (parsed.steps || []).map(s => {
          if (typeof s === 'object') {
            if (s.text) return decodeEntities(String(s.text));
            return '';
          }
          return decodeEntities(String(s));
        }).filter(s => s && s.trim().length > 0);

        const hasExplicitId = typeof parsed.id === 'string' && parsed.id.trim() !== '';
        const validExplicitId = hasExplicitId && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.id);
        if (hasExplicitId && !validExplicitId) {
          this.importErrors = [{ path: 'id', message: 'Recipe id must use lowercase letters, digits, and single hyphens.' }];
          this.importWarnings = [];
          setTimeout(() => {
            const panel = document.getElementById('import-errors');
            if (panel) panel.focus();
          }, 0);
          return;
        }
        const requestedId = validExplicitId
          ? parsed.id
          : this.slugify(parsed.meta.name || `recipe-${Date.now()}`);
        if (this.recipes.some(r => r.id === requestedId)
          && !confirm(`A recipe with id "${requestedId}" already exists. Replace it?`)) {
          return;
        }
        if (invalidQuantities.length > 0) {
          this.importErrors = invalidQuantities.map((name) => ({
            path: 'ingredients',
            message: `${name}: qty_g must be a non-negative number or null.`
          }));
          this.importWarnings = [];
          setTimeout(() => {
            const panel = document.getElementById('import-errors');
            if (panel) panel.focus();
          }, 0);
          return;
        }

        const recipe = {
          ...parsed,
          id: requestedId,
          meta: parsed.meta,
          ingredients: parsed.ingredients,
          steps: parsed.steps || [],
          science_notes: Array.isArray(parsed.science_notes) ? parsed.science_notes : [],
          history: parsed.history || []
        };

        if (!recipeValidation) {
          this.importErrors = [{ path: '(validator)', message: 'Recipe validator is unavailable. Reload the page before importing.' }];
          this.importWarnings = [];
          return;
        }

        const validation = recipeValidation.validateRecipe(recipe, {
          schema: recipeSchema,
          legacyWarnings: false
        });
        this.importWarnings = validation.warnings.slice();
        if (unknownQuantities.length > 0) {
          this.importWarnings.push({
            path: 'ingredients',
            message: `${unknownQuantities.length} ingredient(s) have unknown quantities and will not scale: ${unknownQuantities.slice(0, 5).join(', ')}${unknownQuantities.length > 5 ? '...' : ''}`
          });
        }
        if (estimatedQuantities.length > 0) {
          this.importWarnings.push({
            path: 'ingredients',
            message: `${estimatedQuantities.length} quantity estimate(s) are marked as estimated, not verified.`
          });
        }

        if (!validation.valid) {
          this.importErrors = validation.errors;
          setTimeout(() => {
            const panel = document.getElementById('import-errors');
            if (panel) panel.focus();
          }, 0);
          return;
        }

        this.importErrors = [];
        this.upsertRecipe(recipe);
        this.selectedId = requestedId;
        this.loadRecipe();
        this.stepSignals = extractStepSignals(recipe.steps || []);
      } catch (e) {
        this.importErrors = [{ path: '(root)', message: e.message }];
        this.importWarnings = [];
        setTimeout(() => {
          const panel = document.getElementById('import-errors');
          if (panel) panel.focus();
        }, 0);
      }
    },

    parseImportText() {
      const txt = (this.yamlText || '').trim();
      if (!txt) {
        alert('Paste ORF or YAML data first.');
        return null;
      }
      try {
        return JSON.parse(txt);
      } catch (_) {
        /* fall through */
      }
      try {
        return jsyaml.load(txt);
      } catch (e) {
        alert('Import parse error: ' + e.message);
        return null;
      }
    },

    loadORF() {
      const parsed = this.parseImportText();
      if (!parsed) return;
      try {
        const mapped = fromOrf(parsed);
        const id = this.slugify(mapped.meta.name || `recipe-${Date.now()}`);
        if (this.recipes.some(r => r.id === id)
          && !confirm(`A recipe with id "${id}" already exists. Replace it?`)) {
          return;
        }
        const recipe = { id, ...mapped };
        if (!recipeValidation) {
          this.importErrors = [{ path: '(validator)', message: 'Recipe validator is unavailable. Reload the page before importing.' }];
          this.importWarnings = [];
          return;
        }
        const validation = recipeValidation.validateRecipe(recipe, { schema: recipeSchema });
        this.importErrors = validation.errors;
        this.importWarnings = validation.warnings;
        if (!validation.valid) {
          setTimeout(() => {
            const panel = document.getElementById('import-errors');
            if (panel) panel.focus();
          }, 0);
          return;
        }
        this.upsertRecipe(recipe);
        this.selectedId = id;
        this.loadRecipe();
        this.stepSignals = extractStepSignals(recipe.steps || []);
      } catch (e) {
        this.importErrors = [{ path: '(root)', message: e.message }];
        this.importWarnings = [];
      }
    },

    saveYaml() {
      try {
        const copy = clone(this.current);
        this.yamlText = jsyaml.dump(copy, { lineWidth: 120 });
      } catch (e) {
        alert('YAML save error: ' + e.message);
      }
    },

    saveORF() {
      try {
        const orf = toOrf(this.current);
        this.yamlText = jsyaml.dump(orf, { lineWidth: 120 });
      } catch (e) {
        alert('ORF export error: ' + e.message);
      }
    },

    deleteCurrentRecipe() {
      if (!confirm(`Delete "${this.current.meta.name}"? This cannot be undone.`)) return;
      if (this.selectedId) {
        deletedRecipeIds.add(this.selectedId);
        saveDeletedRecipeIds(deletedRecipeIds);
      }
      this.recipes = this.recipes.filter(r => r.id !== this.selectedId);
      saveSelectedRecipeId('');
      this.persistRecipes();
      this.hasUnsavedChanges = true;
      if (this.recipes.length > 0) {
        this.selectedId = this.recipes[0].id;
        this.loadRecipe();
      } else {
        this.current = { id: 'empty', meta: { name: 'No Recipe', source: '', base_servings: 1 }, ingredients: [], steps: [], science_notes: [] };
      }
    },

    async collectFullRecipes() {
      const recipes = [];
      const failed = [];
      const expected = this.recipes.length;
      for (const recipe of this.recipes) {
        const incomplete = recipe._placeholder
          || !Array.isArray(recipe.ingredients)
          || recipe.ingredients.length === 0;
        let full = recipe;
        if (incomplete) {
          const fetched = await fetchRecipeYaml(recipe.id);
          if (!fetched) {
            failed.push(recipe.id);
            continue;
          }
          full = fetched;
        }
        if (!Array.isArray(full.ingredients) || full.ingredients.length === 0
          || !Array.isArray(full.steps) || full.steps.length === 0) {
          failed.push(recipe.id);
          continue;
        }
        const copy = clone(full);
        delete copy._placeholder;
        recipes.push(copy);
      }
      return { recipes, failed, expected };
    },

    buildExportManifest({ expected, recipes, failed }) {
      return {
        format_version: '2.0',
        export_type: failed.length ? 'partial' : 'complete',
        expected_recipes: expected,
        exported_recipes: recipes.length,
        missing_recipe_ids: failed
      };
    },

    async prepareExport() {
      let result = await this.collectFullRecipes();
      if (result.failed.length > 0) {
        const retry = confirm(`Could not load ${result.failed.length} recipe(s): ${result.failed.join(', ')}. Retry before exporting?`);
        if (retry) result = await this.collectFullRecipes();
      }
      if (result.failed.length > 0) {
        const partial = confirm(`Still missing ${result.failed.length} recipe(s): ${result.failed.join(', ')}. Export a partial backup that explicitly lists them? Choose Cancel to stop.`);
        if (!partial) {
          alert('Export cancelled. No backup was created.');
          return null;
        }
      }
      return result;
    },

    async downloadBackup() {
      try {
        const result = await this.prepareExport();
        if (!result) return;
        const { recipes, failed, expected } = result;
        const backup = {
          version: '2.0',
          exported: new Date().toISOString(),
          count: recipes.length,
          deleted_recipe_ids: [...deletedRecipeIds],
          manifest: this.buildExportManifest({ expected, recipes, failed }),
          recipes
        };
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cookbook-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.hasUnsavedChanges = false;
        if (failed.length) {
          alert(`Partial JSON backup: ${recipes.length} of ${expected} recipes. Missing: ${failed.join(', ')}.`);
        } else {
          alert(`Complete JSON backup: ${recipes.length} recipes.`);
        }
      } catch (err) {
        alert('Backup failed: ' + err.message);
      }
    },

    async downloadAllAsZip() {
      if (typeof JSZip === 'undefined') {
        alert('JSZip library not loaded. Please refresh the page.');
        return;
      }
      try {
        const result = await this.prepareExport();
        if (!result) return;
        const { recipes, failed, expected } = result;
        const zip = new JSZip();
        recipes.forEach(recipe => {
          const yaml = jsyaml.dump(recipe, { lineWidth: 120 });
          zip.file(`${recipe.id}.yaml`, yaml);
        });
        zip.file('manifest.json', JSON.stringify(this.buildExportManifest({ expected, recipes, failed }), null, 2));
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cookbook-recipes-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (failed.length) {
          alert(`Partial ZIP backup: ${recipes.length} of ${expected} recipes. Missing: ${failed.join(', ')}. See manifest.json.`);
        } else {
          alert(`Complete ZIP backup: ${recipes.length} recipes.`);
        }
      } catch (err) {
        alert('ZIP export failed: ' + err.message);
      }
    },

    scaledQty(baseQty) {
      const base = Number(this.current.meta.base_servings) || 1;
      const qty = Number(baseQty) || 0;
      return (qty * this.servings) / base;
    },

    adjustServings() {
      const cap = 64;
      let s = Number(this.servings) || 1;
      if (s < 1) s = 1;
      if (s > cap) s = cap;
      s = Math.round(s);
      this.servings = s;
    },

    resetServings() {
      const base = Number(this.current?.meta?.base_servings) || 1;
      this.servings = base;
      this.adjustServings();
    },

    findWWSub(ing) {
      if (!this.wwMode || !Array.isArray(ing.substitutions)) return null;
      return ing.substitutions.find(sub => (sub.tags || []).includes('ww')) || null;
    },

    dietDefinition() {
      if (this.dietMode === 'vegan') {
        return 'Vegan: no animal-derived ingredients, including dairy, eggs, honey, gelatin, and animal rennet. Vegetarian recipes are not automatically vegan.';
      }
      if (this.dietMode === 'vegetarian') {
        return 'Vegetarian: no meat, poultry, fish, or shellfish. Dairy and eggs may remain. Cheeses may use animal rennet; check labels.';
      }
      return 'Choose Vegetarian or Vegan to see suggested ingredient substitutions. Definitions are guidance, not certification.';
    },

    findDietSub(ing) {
      if (this.dietMode === 'none') return null;
      const substitutions = Array.isArray(ing.substitutions) ? ing.substitutions : [];
      const hasTag = (sub, tag) => (sub.tags || []).includes(tag);
      let direct = null;
      if (this.dietMode === 'vegan') {
        direct = substitutions.find((sub) => hasTag(sub, 'vegan'));
      } else {
        direct = substitutions.find((sub) => hasTag(sub, 'vegetarian') || hasTag(sub, 'veg'))
          || substitutions.find((sub) => hasTag(sub, 'vegan'));
      }
      if (direct) return direct;

      // Fallback to the reviewed meat-substitution library.
      const normalizedName = normalizeKey(ing.name || '');
      let options = meatSubsMap[normalizedName];

      // Avoid matching stocks/broths to meat subs (e.g., chicken stock → veg stock, not tofu)
      if (normalizedName.includes('stock') || normalizedName.includes('broth') || normalizedName.includes('bouillon')) {
        options = null;
      }

      // Try substring match so "chicken thighs" still matches base "chicken"
      if ((!options || !options.length) && normalizedName) {
        const foundKey = Object.keys(meatSubsMap).find(baseKey => normalizedName.includes(baseKey));
        if (foundKey) options = meatSubsMap[foundKey];
      }

      if (options && options.length) {
        const first = options.find((option) => this.dietMode === 'vegan'
          ? (option.tags || []).includes('vegan')
          : ((option.tags || []).includes('vegetarian') || (option.tags || []).includes('veg') || (option.tags || []).includes('vegan')));
        if (first) {
          return {
            name: first.name,
            ratio: first.ratio || 1,
            science_note: first.science_note || '',
            ww_points: first.ww_points ?? null,
            tags: first.tags || ['vegan', 'vegetarian']
          };
        }
      }
      return null;
    },

    displayIngredients() {
      const _v = this.nutritionVersion;
      console.log('[DEBUG] displayIngredients called, current.ingredients:', this.current?.ingredients);
      if (!this.current || !this.current.ingredients) {
        console.log('[DEBUG] No current or ingredients!');
        return [];
      }
      return this.current.ingredients.map(ing => {
        const dietSub = this.findDietSub(ing);
        const wwSub = this.findWWSub(ing);
        const baseName = sanitizeText(ing.name);
        const baseVol = sanitizeText(ing.vol_est);
        
        // Debug: log what we found
        if (dietSub || wwSub) {
          console.log(`[DEBUG] Suggestions for ${baseName}:`, {
            dietSub: dietSub?.name,
            wwSub: wwSub?.name,
            substitutions: ing.substitutions
          });
        }
        
        // No auto-swap; surface suggestions instead
        const shouldScale = ing.no_scale !== true;
        const hasQuantity = typeof ing.qty_g === 'number' && Number.isFinite(ing.qty_g) && ing.qty_g > 0;
        const qty = hasQuantity
          ? (shouldScale ? this.scaledQty(ing.qty_g) : ing.qty_g)
          : ing.qty_g;
        const nutrition = ingredientNutrition(baseName, qty);
        const nutritionTooltip = nutrition
          ? `${nutrition.calories} kcal • P ${nutrition.protein}g • F ${nutrition.fat}g • C ${nutrition.carbs}g${nutrition.fiber ? ' • Fiber ' + nutrition.fiber + 'g' : ''}`
          : '';
        
        // Prioritize the selected dietary mode, then weight-conscious.
        const dietLabel = this.dietMode === 'vegan' ? 'Vegan' : 'Vegetarian';
        const suggestion = dietSub
          ? { icon: '🌱', text: `${dietLabel}: ${dietSub.name}${dietSub.science_note ? ' - ' + dietSub.science_note : ''}` }
          : wwSub
            ? { icon: '⚖️', text: `Weight-conscious: ${wwSub.name}${wwSub.science_note ? ' - ' + wwSub.science_note : ''}` }
            : null;
        
        return {
          name: baseName,
          displayName: baseName,
          qty_g: qty,
          vol_est: baseVol,
          function: ing.function,
          ww_points: ing.ww_points,
          science_note: suggestion ? suggestion.text : '',
          swapped: false,
          hasQuantity,
          quantity_source: ing.quantity_source || null,
          quantityUnknown: !hasQuantity && ing.estimated !== true,
          estimated: ing.estimated === true,
          nutrition,
          nutritionTooltip,
          suggestion
        };
      });
    },

    nutritionSummary() {
      const _v = this.nutritionVersion;
      const ingredients = Array.isArray(this.current?.ingredients) ? this.current.ingredients : [];
      const cacheKey = [
        this.selectedId,
        this.servings,
        this.current?.meta?.base_servings,
        _v,
        ingredients.map(i => `${i.name || ''}:${i.qty_g}`).join('|')
      ].join('::');
      if (nutritionCache.key === cacheKey) return nutritionCache.value;

      const base = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
      const missingQuantities = [];
      const missingReferences = [];
      this.displayIngredients().forEach(ing => {
        if (!ing.nutrition) {
          if (!ing.hasQuantity) missingQuantities.push(ing.displayName);
          else missingReferences.push(ing.displayName);
          return;
        }
        base.calories += ing.nutrition.calories || 0;
        base.protein += ing.nutrition.protein || 0;
        base.fat += ing.nutrition.fat || 0;
        base.carbs += ing.nutrition.carbs || 0;
        base.fiber += ing.nutrition.fiber || 0;
      });
      const servings = Number(this.servings) || 1;
      const per = {
        calories: Math.round(base.calories / servings),
        protein: +(base.protein / servings).toFixed(1),
        fat: +(base.fat / servings).toFixed(1),
        carbs: +(base.carbs / servings).toFixed(1),
        fiber: +(base.fiber / servings).toFixed(1)
      };
      const missing = [...missingQuantities, ...missingReferences];
      const value = {
        total: base,
        per,
        coverage: {
          covered: ingredients.length - missing.length,
          total: ingredients.length,
          missing,
          missingQuantities,
          missingReferences
        }
      };
      nutritionCache = { key: cacheKey, value };
      return value;
    },

    nutritionCoverageLabel() {
      const coverage = this.nutritionSummary().coverage;
      return coverage.missing.length ? 'Known-ingredient subtotal' : 'Estimated nutrition total';
    },

    nutritionCoverageText() {
      const coverage = this.nutritionSummary().coverage;
      if (!coverage.total) return '';
      const parts = [`Approximate: nutrition data covers ${coverage.covered} of ${coverage.total} ingredients.`];
      if (coverage.missingQuantities.length) {
        parts.push(`${coverage.missingQuantities.length} ingredient(s) lack a usable quantity.`);
      }
      if (coverage.missingReferences.length) {
        parts.push(`${coverage.missingReferences.length} ingredient(s) lack reference data.`);
      }
      if (coverage.missing.length) {
        const names = coverage.missing.slice(0, 3).join(', ');
        const more = coverage.missing.length > 3 ? ` and ${coverage.missing.length - 3} more` : '';
        parts.push(`Not counted: ${names}${more}. Actual nutrition will be higher or otherwise different.`);
      }
      parts.push('Values are per-100 g references, not lab measurements.');
      return parts.join(' ');
    },

    afterRender(callback) {
      if (typeof this.$nextTick === 'function') this.$nextTick(callback);
      else setTimeout(callback, 0);
    },

    handleLocationChange() {
      const id = (new URLSearchParams(window.location.search).get('recipe') || '').trim();
      if (!id) {
        this.showHome = true;
        this.homeNotice = '';
        document.title = 'Science-Based Smart Cookbook';
        return;
      }
      if (!this.recipes.some((recipe) => recipe.id === id) || deletedRecipeIds.has(id)) {
        this.showHome = true;
        this.homeNotice = 'That recipe link no longer points to a recipe in this cookbook.';
        this.cleanRecipeUrl();
        return;
      }
      this.loadRecipe(id, { skipUrl: true });
    },

    cleanRecipeUrl() {
      if (typeof window === 'undefined' || !window.history) return;
      const url = new URL(window.location.href);
      url.searchParams.delete('recipe');
      url.hash = '';
      window.history.replaceState({}, '', url);
    },

    goHome() {
      this.showHome = true;
      this.homeNotice = '';
      this.shareStatus = '';
      this.shareFallback = '';
      if (typeof window !== 'undefined' && window.history) {
        const url = new URL(window.location.href);
        url.searchParams.delete('recipe');
        url.hash = '';
        window.history.pushState({ home: true }, '', url);
      }
      document.title = 'Science-Based Smart Cookbook';
      this.afterRender(() => {
        const heading = document.getElementById('home-heading');
        if (heading) heading.focus({ preventScroll: true });
        if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'auto' });
      });
    },

    sourceLabel(source) {
      if (!source) return 'Recipe';
      try {
        return new URL(source).hostname.replace(/^www\./, '');
      } catch (_) {
        return String(source);
      }
    },

    libraryRecipes() {
      return this.recipes.filter((recipe) => recipe && !recipe._demo);
    },

    recipeUrl(id) {
      if (!id || typeof window === 'undefined') return '';
      return new URL(`recipes/${encodeURIComponent(id)}.html`, window.location.href).toString();
    },

    shareUrlFor(anchor = '') {
      if (!this.current?.id) return '';
      const url = new URL(this.recipeUrl(this.current.id));
      // The focused static recipe page has ingredients, steps, science, dietary,
      // and notes anchors. Nutrition and experiments exist only in the app.
      const supported = new Set(['ingredients', 'steps', 'science', 'dietary', 'notes']);
      url.hash = supported.has(anchor) ? anchor : '';
      return url.toString();
    },

    async shareRecipe(anchor = '') {
      if (!this.current?.id) return;
      const currentHash = (window.location.hash || '').replace(/^#/, '');
      const selectedAnchor = anchor || currentHash;
      const url = this.shareUrlFor(selectedAnchor);
      const data = {
        title: `${this.current.meta?.name || 'Recipe'} — Science-Based Smart Cookbook`,
        text: `A shareable recipe from the Science-Based Smart Cookbook: ${this.current.meta?.name || ''}`,
        url
      };
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share(data);
          this.shareStatus = 'Share sheet opened.';
          return;
        } catch (error) {
          if (error && error.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        this.shareStatus = 'Recipe link copied to the clipboard.';
        this.shareFallback = '';
      } catch (error) {
        this.shareFallback = url;
        this.shareStatus = 'Copy this recipe link:';
      }
    },

    restoreHashTarget() {
      if (typeof document === 'undefined') return;
      const id = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
      if (!id) return;
      if (id === 'science' && !this.scienceMode) {
        this.scienceMode = true;
        this.afterRender(() => this.restoreHashTarget());
        return;
      }
      const target = document.getElementById(id);
      if (!target) return;
      if (target.tagName === 'DETAILS') target.open = true;
      const focusTarget = target.tagName === 'DETAILS' ? target.querySelector('summary') : target;
      if (focusTarget) {
        if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus({ preventScroll: true });
      }
      if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
    },

    provenanceText(provenance) {
      if (!provenance) return '';
      const type = provenance.type ? provenance.type.replace(/_/g, ' ') : 'provenance';
      const status = provenance.status ? provenance.status.replace(/_/g, ' ') : '';
      return status ? `${type} · ${status}` : type;
    },

    equipmentText(item) {
      if (!item) return '';
      const parts = [];
      if (item.name) parts.push(item.name);
      else if (item.type) parts.push(item.type.replace(/_/g, ' '));
      if (item.base) parts.push(`${item.base} base`);
      if (item.size_inches) parts.push(`${item.size_inches} in`);
      return parts.join(' · ');
    },

    outcomesText(outcomes) {
      if (!Array.isArray(outcomes) || outcomes.length === 0) return '';
      return outcomes.map((outcome) => String(outcome).replace(/_/g, ' ')).join(', ');
    },

    recipeFingerprint() {
      if (!this.current) return '';
      return hashString(JSON.stringify({
        id: this.current.id,
        meta: this.current.meta,
        ingredients: this.current.ingredients,
        steps: this.current.steps
      }));
    },

    prepareExperimentForm() {
      const id = this.current?.id || '';
      if (this.experimentForm.recipe_id !== id) this.resetExperimentForm();
      this.refreshComparison();
    },

    resetExperimentForm() {
      this.experimentForm = {
        date: localToday(),
        recipe_id: this.current?.id || '',
        variation_id: 'weeknight',
        recipe_revision: this.recipeFingerprint(),
        equipment: {
          pan_type: '',
          pan_size_inches: '',
          surface: '',
          stovetop_pre_sear: false,
          oven_temperature_c: '',
          baking_minutes: '',
          broiler_used: false
        },
        ingredient_changes: '',
        observations: {
          top_crispness: '',
          bottom_crispness: '',
          mushroom_intensity: '',
          creaminess: '',
          sticking: '',
          cleaning_difficulty: '',
          ease_of_serving: ''
        },
        actual_elapsed_minutes: '',
        cost_cad: '',
        notes: ''
      };
      this.editingExperimentId = null;
      this.experimentSaved = false;
      this.experimentStatus = 'No experiment saved yet.';
    },

    numberOrNull(value) {
      if (value === '' || value === null || value === undefined) return null;
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : null;
    },

    ratingOrNull(value) {
      if (value === '' || value === null || value === undefined) return null;
      const number = Number(value);
      return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
    },

    experimentsForCurrent() {
      const id = this.current?.id;
      if (!id) return [];
      return this.experiments
        .filter((experiment) => experiment.recipe_id === id)
        .slice()
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    },

    experimentValue(value, suffix = '') {
      if (value === null || value === undefined || value === '') return 'Not recorded';
      if (value === true) return 'Yes';
      if (value === false) return 'No';
      return `${value}${suffix}`;
    },

    experimentLabel(experiment) {
      const pan = experiment?.equipment?.pan_type || 'pan not recorded';
      return `${experiment?.date || 'date not recorded'} · ${pan.replace(/_/g, ' ')}`;
    },

    markExperimentDirty() {
      if (!this.experimentSaved) return;
      this.experimentSaved = false;
      this.experimentStatus = 'Unsaved changes.';
    },

    saveExperiment() {
      const form = this.experimentForm || {};
      const recipeId = this.current?.id || form.recipe_id;
      if (!recipeId) {
        this.experimentStatus = 'Open a recipe before saving an experiment.';
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.date || ''))) {
        this.experimentStatus = 'Enter a valid cooking date (YYYY-MM-DD).';
        return;
      }

      const equipment = form.equipment || {};
      const observations = form.observations || {};
      const existing = this.experiments.find((experiment) => experiment.id === this.editingExperimentId);
      const record = {
        id: existing?.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recipe_id: recipeId,
        variation_id: form.variation_id || 'weeknight',
        recipe_revision: form.recipe_revision || this.recipeFingerprint(),
        date: form.date,
        equipment: {
          pan_type: equipment.pan_type || '',
          pan_size_inches: this.numberOrNull(equipment.pan_size_inches),
          surface: equipment.surface || '',
          stovetop_pre_sear: equipment.stovetop_pre_sear === true,
          oven_temperature_c: this.numberOrNull(equipment.oven_temperature_c),
          baking_minutes: this.numberOrNull(equipment.baking_minutes),
          broiler_used: equipment.broiler_used === true
        },
        ingredient_changes: String(form.ingredient_changes || '').trim(),
        observations: {
          top_crispness: this.ratingOrNull(observations.top_crispness),
          bottom_crispness: this.ratingOrNull(observations.bottom_crispness),
          mushroom_intensity: this.ratingOrNull(observations.mushroom_intensity),
          creaminess: this.ratingOrNull(observations.creaminess),
          sticking: this.ratingOrNull(observations.sticking),
          cleaning_difficulty: this.ratingOrNull(observations.cleaning_difficulty),
          ease_of_serving: this.ratingOrNull(observations.ease_of_serving)
        },
        actual_elapsed_minutes: this.numberOrNull(form.actual_elapsed_minutes),
        cost_cad: this.numberOrNull(form.cost_cad),
        notes: String(form.notes || '').trim(),
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const index = this.experiments.findIndex((experiment) => experiment.id === record.id);
      const next = this.experiments.slice();
      if (index >= 0) next.splice(index, 1, record);
      else next.push(record);

      if (!saveExperimentsToStorage(next)) {
        this.experimentStatus = 'Could not save the experiment in this browser. Storage may be full or unavailable.';
        return;
      }
      this.experiments = next;
      this.editingExperimentId = record.id;
      this.experimentSaved = true;
      this.experimentStatus = 'Saved locally at ' + new Date().toLocaleTimeString() + '.';
      this.refreshComparison();
    },

    editExperiment(id) {
      const experiment = this.experiments.find((item) => item.id === id);
      if (!experiment) return;
      const copy = clone(experiment);
      this.experimentForm = {
        date: copy.date || localToday(),
        recipe_id: copy.recipe_id,
        variation_id: copy.variation_id || 'weeknight',
        recipe_revision: copy.recipe_revision || '',
        equipment: { ...(copy.equipment || {}) },
        ingredient_changes: copy.ingredient_changes || '',
        observations: { ...(copy.observations || {}) },
        actual_elapsed_minutes: copy.actual_elapsed_minutes ?? '',
        cost_cad: copy.cost_cad ?? '',
        notes: copy.notes || ''
      };
      this.editingExperimentId = id;
      this.experimentSaved = true;
      this.experimentStatus = 'Editing a saved experiment.';
    },

    deleteExperiment(id) {
      if (!confirm('Delete this locally saved experiment? This cannot be undone.')) return;
      const next = this.experiments.filter((experiment) => experiment.id !== id);
      if (!saveExperimentsToStorage(next)) {
        this.experimentStatus = 'Could not update experiment storage.';
        return;
      }
      this.experiments = next;
      if (this.editingExperimentId === id) this.resetExperimentForm();
      this.experimentStatus = 'Experiment deleted from this browser.';
      this.refreshComparison();
    },

    exportExperiments() {
      this.experimentJson = JSON.stringify({
        format_version: '1.0',
        exported: new Date().toISOString(),
        experiments: this.experiments
      }, null, 2);
      this.experimentStatus = 'Experiment JSON prepared. It has not been uploaded anywhere.';
    },

    importExperiments() {
      let data;
      try {
        data = JSON.parse(this.experimentJson || '');
      } catch (error) {
        this.experimentStatus = 'Experiment import failed: invalid JSON.';
        return;
      }
      const incoming = Array.isArray(data) ? data : data?.experiments;
      if (!Array.isArray(incoming)) {
        this.experimentStatus = 'Experiment import failed: expected an experiments array.';
        return;
      }
      const valid = incoming.filter((experiment) => experiment && typeof experiment === 'object' && experiment.id && experiment.recipe_id);
      if (valid.length !== incoming.length) {
        this.experimentStatus = 'Experiment import failed: every record needs an id and recipe_id.';
        return;
      }
      const next = this.experiments.slice();
      for (const experiment of valid) {
        const index = next.findIndex((item) => item.id === experiment.id);
        if (index >= 0) {
          if (!confirm(`An experiment with id "${experiment.id}" already exists. Replace it?`)) continue;
          next.splice(index, 1, experiment);
        } else {
          next.push(experiment);
        }
      }
      if (!saveExperimentsToStorage(next)) {
        this.experimentStatus = 'Could not save imported experiments in this browser.';
        return;
      }
      this.experiments = next;
      this.experimentStatus = `Imported ${valid.length} experiment(s).`;
      this.refreshComparison();
    },

    refreshComparison() {
      const list = this.experimentsForCurrent();
      if (list.length < 2) {
        this.comparisonAId = '';
        this.comparisonBId = '';
        return;
      }
      const ids = new Set(list.map((experiment) => experiment.id));
      if (!ids.has(this.comparisonAId)) this.comparisonAId = list[0].id;
      if (!ids.has(this.comparisonBId) || this.comparisonBId === this.comparisonAId) {
        this.comparisonBId = list.find((experiment) => experiment.id !== this.comparisonAId)?.id || '';
      }
    },

    comparisonRows() {
      const first = this.experiments.find((experiment) => experiment.id === this.comparisonAId);
      const second = this.experiments.find((experiment) => experiment.id === this.comparisonBId);
      if (!first || !second) return [];
      const row = (label, getter) => ({
        label,
        a: getter(first),
        b: getter(second)
      });
      return [
        row('Date', (experiment) => this.experimentValue(experiment.date)),
        row('Pan type', (experiment) => this.experimentValue(experiment.equipment?.pan_type)),
        row('Pan size (inches)', (experiment) => this.experimentValue(experiment.equipment?.pan_size_inches)),
        row('Surface', (experiment) => this.experimentValue(experiment.equipment?.surface)),
        row('Stovetop pre-sear', (experiment) => this.experimentValue(experiment.equipment?.stovetop_pre_sear)),
        row('Oven temperature (C)', (experiment) => this.experimentValue(experiment.equipment?.oven_temperature_c)),
        row('Baking minutes', (experiment) => this.experimentValue(experiment.equipment?.baking_minutes)),
        row('Broiler used', (experiment) => this.experimentValue(experiment.equipment?.broiler_used)),
        row('Top crispness (1–5)', (experiment) => this.experimentValue(experiment.observations?.top_crispness)),
        row('Bottom crispness (1–5)', (experiment) => this.experimentValue(experiment.observations?.bottom_crispness)),
        row('Mushroom flavour (1–5)', (experiment) => this.experimentValue(experiment.observations?.mushroom_intensity)),
        row('Interior creaminess (1–5)', (experiment) => this.experimentValue(experiment.observations?.creaminess)),
        row('Sticking (1–5)', (experiment) => this.experimentValue(experiment.observations?.sticking)),
        row('Cleaning difficulty (1–5)', (experiment) => this.experimentValue(experiment.observations?.cleaning_difficulty)),
        row('Ease of serving (1–5)', (experiment) => this.experimentValue(experiment.observations?.ease_of_serving)),
        row('Actual elapsed minutes', (experiment) => this.experimentValue(experiment.actual_elapsed_minutes)),
        row('Approximate cost (CAD)', (experiment) => this.experimentValue(experiment.cost_cad)),
        row('Recipe revision', (experiment) => this.experimentValue(experiment.recipe_revision)),
        row('Notes', (experiment) => this.experimentValue(experiment.notes))
      ];
    },

    formattedIngredient(ing) {
      const amt = this.formatQuantity(ing);
      return amt ? `${amt} ${ing.displayName}`.trim() : ing.displayName;
    },

    stepsList() {
      console.log('[DEBUG] stepsList called, current:', this.current);
      console.log('[DEBUG] current.steps:', this.current?.steps);
      if (!this.current || !Array.isArray(this.current.steps)) {
        console.log('[DEBUG] No current or steps array!');
        return [];
      }
      const result = this.current.steps.map(step => convertTemperatureInText(step, this.prefs.tempUnit));
      console.log('[DEBUG] stepsList result length:', result.length);
      return result;
    },

    formatMinutesFriendly(minutes) {
      if (!Number.isFinite(minutes)) return '';
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        const hPart = `${formatNumber(hours, { max: 0 })} h`;
        const mPart = mins ? ` ${formatNumber(mins, { max: 0 })} m` : '';
        return `${hPart}${mPart}`.trim();
      }
      return `${formatNumber(minutes, { max: 0 })} min`;
    },

    gramToVolume(name, grams) {
      const density = densityPerCup[name];
      // No ingredient-specific density means no honest volume estimate.
      if (!density) return null;
      const cups = grams / density;
      if (cups >= 0.5) {
        const val = roundToStep(cups, 0.25, 0.25);
        return `${toFractionQuarter(val)} ${val > 1 ? 'cups' : 'cup'}`;
      }
      const tbsp = cups * 16;
      if (tbsp >= 1) {
        const val = roundToStep(tbsp, 0.25, 0.25);
        return `${toFractionQuarter(val)} tbsp`;
      }
      const tsp = tbsp * 3;
      const val = roundToStep(tsp, 0.25, 0.25);
      return `${formatNumber(val, { max: 2 })} tsp`;
    },

    gramToMl(name, grams) {
      const density = densityPerCup[name]; // grams per cup
      // Do not use water density as a universal assumption.
      if (!density) return null;
      const mlPerCup = 240;
      const ml = grams / density * mlPerCup;
      if (ml >= 1000) {
        const liters = ml / 1000;
        return `${formatNumber(roundToStep(liters, 0.1, 0.1), { max: 1 })} L`;
      }
      if (ml >= 100) return `${formatNumber(roundToStep(ml, 5, 5), { max: 0 })} ml`;
      if (ml >= 10) return `${formatNumber(roundToStep(ml, 1, 5), { max: 1 })} ml`;
      return `${formatNumber(roundToStep(ml, 0.5, 0.5), { max: 2 })} ml`;
    },

    gramToOunces(grams) {
      return grams / 28.3495;
    },

    formatGrams(qty) {
      const roundedG = qty >= 100 ? roundToStep(qty, 1) : qty >= 10 ? roundToStep(qty, 0.5) : roundToStep(qty, 0.1, 0.1);
      const places = roundedG >= 100 ? 0 : 1;
      return `${formatNumber(roundedG, { max: places, min: 0 })} g`;
    },

    formatQuantity(ing) {
      const qty = Number(ing.qty_g);
      const hasQty = Number.isFinite(qty) && qty > 0;
      const ingName = ing.displayName || ing.name || '';

      // Prefer whole counts for known whole-unit items (e.g., bananas)
      if (!this.precisionMode && hasQty) {
        const key = resolveWholeUnitKey('', ingName) || normalizeKey(ingName).replace(/_/g, ' ');
        if (key && wholeUnitWeights[key]) {
          const per = wholeUnitWeights[key].default || Object.values(wholeUnitWeights[key])[0];
          if (per && per > 0) {
            const count = qty / per;
            if (count >= 0.25) {
              const display = toFractionQuarter(count);
              const noun = key.split(' ')[0];
              // If the ingredient name already contains the noun, do not repeat it
              // ("1 onion", not "1 onion onion").
              if (ingName.toLowerCase().includes(noun)) {
                if (key === 'garlic clove' && !/clove/i.test(ingName)) {
                  return `${display} clove${count >= 2 ? 's' : ''}`;
                }
                return display;
              }
              return `${display} ${key}${count >= 2 ? 's' : ''}`;
            }
          }
        }
      }

      // Precision mode means weight, regardless of volume or display preferences.
      if (this.precisionMode && hasQty) {
        if (this.prefs.weightUnit === 'oz') {
          const oz = this.gramToOunces(qty);
          const roundedOz = oz >= 8 ? roundToStep(oz, 0.1) : oz >= 1 ? roundToStep(oz, 0.05) : roundToStep(oz, 0.01, 0.01);
          const places = roundedOz >= 1 ? 1 : 2;
          return `${formatNumber(roundedOz, { max: places, min: 0 })} oz`;
        }
        return this.formatGrams(qty);
      }

      // Check if this ingredient has a display preference (e.g., salt prefers tsp)
      const displayPref = getDisplayPref(ingName);
      if (displayPref && hasQty) {
        const units = roundToStep(qty / displayPref.gramsPerUnit, 0.25, 0.25);
        if (displayPref.unit === 'tsp') {
          if (units >= 12) {
            const cups = roundToStep(units / 48, 0.25, 0.25); // 48 tsp = 1 cup
            return `${toFractionQuarter(cups)} cups`;
          }
          if (units >= 4) {
            const tbsp = roundToStep(units / 3, 0.25, 0.25); // 3 tsp = 1 tbsp
            return `${toFractionQuarter(tbsp)} tbsp`;
          }
        }
        if (displayPref.unit === 'tbsp' && units >= 4) {
          const cups = roundToStep(units / 16, 0.25, 0.25); // 16 tbsp = 1 cup
          return `${toFractionQuarter(cups)} cups`;
        }
        // Small amounts of a tablespoon-preference ingredient read better in tsp.
        if (displayPref.unit === 'tbsp' && units > 0 && units < 1) {
          const tsp = roundToStep(qty / (displayPref.gramsPerUnit / 3), 0.25, 0.25);
          return `${toFractionQuarter(tsp)} tsp`;
        }
        return `${toFractionQuarter(units)} ${displayPref.unit}`;
      }

      // Best-fit: for auto system, prefer volume for liquids/condiments
      if (hasQty && this.prefs.system === 'auto' && prefersVolume(ingName)) {
        const volume = this.prefs.volumeUnit === 'ml'
          ? this.gramToMl(ingName.toLowerCase(), qty)
          : this.gramToVolume(ingName.toLowerCase(), qty);
        return volume || this.formatGrams(qty);
      }

      // Metric regions show grams for solids and ml for liquids. Converting
      // cheese, mushrooms, or flour to millilitres is misleading.
      const metricUnits = this.prefs.system === 'metric' || (this.prefs.system === 'auto' && this.prefs.volumeUnit === 'ml');
      if (hasQty && metricUnits && !prefersVolume(ingName)) return this.formatGrams(qty);

      // If no numeric qty, show vol_est if present
      if (!hasQty && ing.vol_est) {
        const amount = amountFromVolEst(ing.vol_est);
        return amount.toLowerCase() === String(ingName).toLowerCase() ? '' : amount;
      }

      // Volume path; unknown densities fall back to an honest weight.
      if (this.prefs.volumeUnit === 'ml') {
        return this.gramToMl(ingName.toLowerCase(), hasQty ? qty : 0) || this.formatGrams(qty);
      }
      return this.gramToVolume(ingName.toLowerCase(), hasQty ? qty : 0) || this.formatGrams(qty);
    },

    async copyRecipe() {
      const ingredients = this.displayIngredients()
        .map(ing => {
          const note = ing.estimated ? ' (estimated)' : ing.quantityUnknown ? ' (quantity unknown)' : '';
          return `• ${this.formatQuantity(ing)} ${ing.displayName}${note}`.trim();
        })
        .join('\n');
      const steps = this.current.steps
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n');
      const shareText = `${this.current.meta.name}\n\nIngredients:\n${ingredients}\n\nSteps:\n${steps}\n\nRecipe from: ${this.current.meta.source}`;
      await navigator.clipboard.writeText(shareText);
      alert('Recipe copied! Paste in email, WhatsApp, or anywhere.');
    },

    async copyAIPrompt() {
      const prompt = `I am making ${this.current.meta.name}. I need to substitute [Ingredient] with [User Input]. ` +
        `Given that [Ingredient] provides [Function], how should I adjust the other variables?`;
      await navigator.clipboard.writeText(prompt);
      alert('AI prompt copied to clipboard');
    },

    async copyBookmarklet() {
      await navigator.clipboard.writeText(this.bookmarkletCode);
      alert('Bookmarklet code copied to clipboard');
    }
  };
}

// Expose globally for Alpine inline x-data
window.cookbookApp = cookbookApp;
