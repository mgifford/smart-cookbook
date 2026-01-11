function cookbookApp() {
  // Check if debug mode is enabled via ?debug=true
  const debugMode = new URLSearchParams(window.location.search).get('debug') === 'true';
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
    const decoded = decodeEntities(raw || '');
    const unitTokens = '(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce?s?|pounds?|lbs?|grams?|g|kg|ml|millilit(er)?s?|lit(er)?s?|l)';
    const regex = /^\s*([0-9]+[0-9.,\/\s]*)?\s*(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce?s?|pounds?|lbs?|grams?|g|kg|ml|millilit(er)?s?|lit(er)?s?|l)?\s*(of\s+)?/i;
    const cleaned = decoded.replace(regex, '').trim();
    return cleaned || decoded.trim();
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
    const re = /^\s*([0-9]+(?:[0-9.,\/\s]*[0-9])?)\s*(cups?|cup|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce?s?|pounds?|lbs?|grams?|g|kg|ml|millilit(er)?s?|lit(er)?s?|l)?/i;
    const m = String(vol).match(re);
    if (m) {
      const qty = m[1].trim();
      const unit = m[2] ? m[2].trim() : '';
      return `${qty}${unit ? ' ' + unit : ''}`;
    }
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
    const match = str.match(/^\s*([0-9.\/]+)\s*(cups?|cup|tbsp|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce?s?|pounds?|lbs?|grams?|g|kg|eggs?|egg|bananas?|banana|apples?|apple|onions?|carrots?|cloves?|garlic|tomatoes?|peppers?|potatoes?|limes?|lemons?|oranges?|cans?)/i);
    
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
    
    // Pattern to match temperatures like: 175C, 350F, 180 degrees C, 350 degrees F, etc.
    const tempRegex = /(\d+)\s*(degrees?\s*)?(C|F|Celsius|Fahrenheit)/gi;
    
    return text.replace(tempRegex, (match, temp, degrees, unit) => {
      const tempNum = parseFloat(temp);
      const sourceUnit = unit.toUpperCase().charAt(0);
      
      if (sourceUnit === targetUnit.toUpperCase()) {
        // Already in target unit
        return match;
      }
      
      let converted;
      if (targetUnit.toUpperCase() === 'F' && sourceUnit === 'C') {
        // C to F
        converted = Math.round((tempNum * 9/5) + 32);
        return `${converted}${degrees || ''}F`;
      } else if (targetUnit.toUpperCase() === 'C' && sourceUnit === 'F') {
        // F to C
        converted = Math.round((tempNum - 32) * 5/9);
        return `${converted}${degrees || ''}C`;
      }
      
      return match;
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
        ww_points: sub.ww_points,
        tags: sub.tags
      })),
      extensions: {
        x_qty_g: Number.isFinite(ing.qty_g) ? Number(ing.qty_g) : null,
        x_vol_est: ing.vol_est || null,
        x_function: ing.function || null,
        x_ww_points: ing.ww_points || null,
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
          ww_points: r.meta?.ww_points || null
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
      return {
        name: sanitizeText(ing.item || ing.name || 'ingredient'),
        qty_g: Number.isFinite(qtyG) ? qtyG : 0,
        vol_est: sanitizeText(volEst || ''),
        function: ext.x_function || ing.function || ing.notes || '',
        ww_points: Number(ext.x_ww_points || ing.ww_points) || 0,
        substitutions: (ext.x_substitutions || ing.substitutions || []).map(sub => ({
          name: sub.item || sub.name || '',
          ratio: sub.ratio || 1,
          science_note: sub.science_note || sub.notes || '',
          ww_points: sub.ww_points || 0,
          tags: sub.tags || []
        }))
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

  const densityPerCup = {
    'all-purpose flour': 120,
    'whole wheat flour': 120,
    'brown sugar': 200,
    'granulated sugar': 200,
    'powdered sugar': 120,
    'greek yogurt': 245,
    'yogurt': 245,
    'cream': 238,
    'heavy cream': 238,
    'buttermilk': 245,
    'butter': 227,
    'milk': 245,
    'water': 240,
    'oil (neutral)': 218,
    'vegetable oil': 218,
    'coconut oil': 218,
    'olive oil': 218,
    'honey': 340,
    'maple syrup': 320,
    'coconut milk': 226,
    'coconut milk (canned)': 226,
    'diced tomatoes': 240,
    'tomatoes': 240,
    'tomato sauce': 245,
    'tomato paste': 262,
    'broth': 240,
    'stock': 240,
    'chicken stock': 240,
    'vegetable stock': 240,
    'lentils': 192,
    'red lentils': 192,
    'oats': 80,
    'rolled oats': 80,
    'cornstarch': 128,
    'cocoa powder': 85,
    'rice': 185
  };

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

  const packagedUnitWeights = {
    'can_14_5_oz': 411,
    'can_15_oz': 425,
    'can_13_5_oz': 383
  };

  const wholeUnitWeights = {
    egg: { small: 43, medium: 50, large: 57, xl: 64, default: 57 },
    banana: { small: 101, medium: 118, large: 136, default: 118 },
    apple: { small: 149, medium: 182, large: 223, default: 182 },
    onion: { small: 70, medium: 150, large: 200, default: 150 },
    carrot: { small: 60, medium: 120, large: 180, default: 120 },
    'garlic clove': { small: 3, medium: 5, large: 7, default: 5 },
    tomato: { small: 100, medium: 150, large: 250, default: 150 },
    'bell pepper': { small: 119, medium: 149, large: 186, default: 149 },
    potato: { small: 150, medium: 300, large: 400, default: 300 },
    lime: { medium: 52, default: 52 },
    lemon: { medium: 84, default: 84 },
    orange: { medium: 184, default: 184 },
    'cilantro bunch': { default: 90 },
    'cinnamon stick': { default: 2.6 }
  };

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
  const ingredientDisplayPrefs = {
    salt: { unit: 'tsp', gramsPerUnit: 6 },
    'sea salt': { unit: 'tsp', gramsPerUnit: 6 },
    'baking soda': { unit: 'tsp', gramsPerUnit: 5 },
    'baking powder': { unit: 'tsp', gramsPerUnit: 5 },
    'vanilla extract': { unit: 'tsp', gramsPerUnit: 5 },
    'almond extract': { unit: 'tsp', gramsPerUnit: 5 },
    'lemon juice': { unit: 'tbsp', gramsPerUnit: 15 },
    'lime juice': { unit: 'tbsp', gramsPerUnit: 15 },
    'orange juice': { unit: 'tbsp', gramsPerUnit: 15 },
    'soy sauce': { unit: 'tbsp', gramsPerUnit: 18 },
    'vinegar': { unit: 'tbsp', gramsPerUnit: 15 },
    'honey': { unit: 'tbsp', gramsPerUnit: 21 },
    'maple syrup': { unit: 'tbsp', gramsPerUnit: 20 },
    'molasses': { unit: 'tbsp', gramsPerUnit: 20 },
    'peanut butter': { unit: 'tbsp', gramsPerUnit: 16 },
    'tahini': { unit: 'tbsp', gramsPerUnit: 15 },
    'cinnamon': { unit: 'tsp', gramsPerUnit: 2.6 },
    'nutmeg': { unit: 'tsp', gramsPerUnit: 2.2 },
    'ginger': { unit: 'tsp', gramsPerUnit: 2 },
    'cayenne': { unit: 'tsp', gramsPerUnit: 2 },
    'paprika': { unit: 'tsp', gramsPerUnit: 2 },
    'black pepper': { unit: 'tsp', gramsPerUnit: 2 },
    'pepper': { unit: 'tsp', gramsPerUnit: 2 }
  };

  // Aliases resolve to a canonical key in ingredientDisplayPrefs
  const ingredientAliasMap = {
    'kosher salt': 'salt',
    'table salt': 'salt',
    'fine sea salt': 'sea salt',
    'caster sugar': 'granulated sugar',
    'confectioners sugar': 'granulated sugar',
    'icing sugar': 'granulated sugar',
    'brown sugar (packed)': 'brown sugar',
    'dark brown sugar': 'brown sugar',
    'light brown sugar': 'brown sugar',
    'greek yoghurt': 'greek yogurt',
    'ap flour': 'all-purpose flour',
    'all purpose flour': 'all-purpose flour',
    'plain flour': 'all-purpose flour',
    'wholemeal flour': 'whole wheat flour',
    'icing sugar (powdered)': 'powdered sugar',
    'powdered sugar': 'powdered sugar',
    'confectioners sugar': 'powdered sugar',
    'rolled oats': 'oats',
    'old fashioned oats': 'oats',
    'whole milk': 'milk',
    'buttermilk': 'milk',
    'heavy cream': 'cream',
    'double cream': 'cream'
  };

  const volumeFirst = new Set([
    'water', 'milk', 'buttermilk', 'cream', 'half and half', 'yogurt', 'greek yogurt',
    'broth', 'stock', 'vegetable stock', 'chicken stock', 'beef stock',
    'oil', 'neutral oil', 'vegetable oil', 'olive oil', 'coconut oil', 'canola oil',
    'coconut milk', 'coconut milk (canned)', 'juice', 'lemon juice', 'lime juice', 'orange juice',
    'vinegar', 'soy sauce'
  ].map(normalizeKey));

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

  const defaultPrefs = resolvedDefaultPrefs();
  const initialRecipes = loadRecipesFromStorage();
  
  // Ensure we have at least one recipe
  console.log('[DEBUG] loadRecipesFromStorage returned:', initialRecipes);
  console.log('[DEBUG] sampleRecipes:', sampleRecipes);
  const recipesToUse = (Array.isArray(initialRecipes) && initialRecipes.length > 0) ? initialRecipes : sampleRecipes;
  const firstRecipe = recipesToUse[0] || { id: 'empty', meta: { name: 'No Recipe', source: '', base_servings: 1 }, ingredients: [], steps: [], science_notes: [] };

  return {
    debugMode,
    nutritionLoaded: false,
    nutritionError: null,
    nutritionVersion: 0,
      stepSignals: { temp: null, timeMinutes: null },
    init() {
      console.log('[DEBUG] init() called');
      console.log('[DEBUG] recipes array:', this.recipes);
      console.log('[DEBUG] selectedId:', this.selectedId);
      console.log('[DEBUG] current:', this.current);
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
    recipes: recipesToUse,
    selectedId: firstRecipe.id,
    current: clone(firstRecipe),
    servings: firstRecipe.meta.base_servings,
    hasUnsavedChanges: false,
    wwMode: true,
    vegMode: true,
    scienceMode: true,
    precisionMode: false,
    showCopyright: false,
    yamlText: '',
    bookmarkletCode: 'javascript:(async()=>{try{const ld=[...document.querySelectorAll("script[type=\\"application/ld+json\\"]")].map(e=>{try{return JSON.parse(e.textContent)}catch{return null}}).flat().filter(Boolean);const r=ld.find(n=>{const t=n["@type"];return Array.isArray(t)?t.includes("Recipe"):t==="Recipe"});if(!r)throw new Error("No JSON-LD recipe found");const toA=v=>Array.isArray(v)?v:(v?[v]:[]);const norm=name=>String(name).replace(/[\\n\\r\\t\\u00AD\\u200B\\u200C\\u200D\\u2060\\xA0]+/g," ").replace(/½/g,"1/2").replace(/¼/g,"1/4").replace(/¾/g,"3/4").replace(/⅓/g,"1/3").replace(/⅔/g,"2/3").replace(/⅕/g,"1/5").replace(/⅖/g,"2/5").replace(/⅗/g,"3/5").replace(/⅘/g,"4/5").replace(/⅙/g,"1/6").replace(/⅚/g,"5/6").replace(/⅛/g,"1/8").replace(/⅜/g,"3/8").replace(/⅝/g,"5/8").replace(/⅞/g,"7/8").replace(/\\s+/g," ").trim();const m=new Map();toA(r.recipeIngredient).forEach(raw=>{const normalized=norm(raw);if(!m.has(normalized))m.set(normalized,{name:normalized,qty_g:0,vol_est:normalized,function:"",ww_points:0,substitutions:[]})});const ing=Array.from(m.values());const steps=toA(r.recipeInstructions).map(s=>typeof s==="string"?s.trim():String(s&&s.text||s&&s["@type"]||"").trim()).filter(Boolean);let src=r.url||r.mainEntityOfPage;if(typeof src==="object")src=src["@id"]||src.url||"";src=src||location.href;const y=[];y.push("meta:");y.push(`  name: ${r.name||"Unknown Recipe"}`);y.push(`  source: ${src}`);y.push(`  base_servings: ${r.recipeYield||1}`);y.push(`  prep_time: ${r.totalTime||""}`);y.push("ingredients:");ing.forEach(i=>{y.push(`  - name: ${i.name}`);y.push(`    qty_g: ${i.qty_g}`);y.push(`    vol_est: "${i.vol_est}"`);y.push("    function: ");y.push("    ww_points: ");y.push("    substitutions: []")});y.push("steps:");steps.forEach(s=>y.push(`  - ${s.replace(/\\n/g," ")}`));y.push("history: []");const txt=y.join("\\n");await navigator.clipboard.writeText(txt);alert("Recipe YAML copied! Paste into import box, then fill in qty_g values.")}catch(e){alert("Bookmarklet error: "+e.message)}})();',
    prefs: loadPrefs() || defaultPrefs,

    loadRecipe() {
      const found = this.recipes.find(r => r.id === this.selectedId);
      console.log('[DEBUG] loadRecipe() called, selectedId:', this.selectedId);
      console.log('[DEBUG] found recipe:', found);
      if (found) {
        this.current = clone(found);
        this.servings = found.meta.base_servings;
        console.log('[DEBUG] current after clone:', this.current);
        console.log('[DEBUG] current.ingredients length:', this.current.ingredients?.length);
        console.log('[DEBUG] current.steps length:', this.current.steps?.length);
        this.stepSignals = extractStepSignals(this.current.steps || []);
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
      const idx = this.recipes.findIndex(r => r.id === recipe.id);
      if (idx >= 0) this.recipes.splice(idx, 1, recipe);
      else this.recipes.push(recipe);
      this.persistRecipes();
    },

    loadYaml() {
      try {
        const parsed = jsyaml.load(this.yamlText);
        console.log('Parsed YAML:', parsed);
        if (!parsed || !parsed.meta || !parsed.ingredients) {
          alert('YAML missing meta or ingredients');
          console.error('Parse failed:', { meta: !!parsed?.meta, ingredients: !!parsed?.ingredients });
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
        // clean base_servings: strip non-numeric, take first number if comma-separated
        const baseStr = String(parsed.meta.base_servings || '').split(/[ ,]/)[0];
        const baseServ = Number(baseStr.replace(/[^0-9.]/g, ''));
        parsed.meta.base_servings = Number.isFinite(baseServ) && baseServ > 0 ? baseServ : 1;

        // Normalize ingredients and dedupe
        const seen = new Set();
        parsed.ingredients = (parsed.ingredients || []).map(ing => {
          let qty = Number(ing.qty_g);
          const rawName = cleanUnicode(ing.name || '');
          const cleanedName = cleanIngredientName(rawName);
          const volEstClean = cleanUnicode(ing.vol_est || '');
          let estimated = false;
          if (!Number.isFinite(qty) || qty <= 0) {
            const est = autoEstimateQty(volEstClean, cleanedName);
            if (est > 0) {
              qty = est;
              estimated = true;
            }
          }
          return {
            ...ing,
            name: cleanedName,
            qty_g: qty,
            vol_est: volEstClean,
            estimated,
            function: ing.function || '',
            ww_points: ing.ww_points || 0,
            substitutions: ing.substitutions || []
          };
        }).filter(ing => {
          const key = `${ing.name.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const missing = parsed.ingredients.filter(ing => !Number.isFinite(ing.qty_g) || ing.qty_g <= 0).map(ing => ing.name);
        if (missing.length > 0) {
          alert(`Heads up: ${missing.length} ingredient(s) still missing grams and will not scale: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
        }
        const estimated = parsed.ingredients.filter(ing => ing.estimated).map(ing => `${ing.name} (${ing.qty_g}g estimated)`);
        if (estimated.length > 0) {
          console.info('[INFO] Estimated qty_g for:', estimated);
        }

        // Normalize steps (ensure strings and decode entities)
        parsed.steps = (parsed.steps || []).map(s => {
          if (typeof s === 'object') {
            if (s.text) return decodeEntities(String(s.text));
            return '';
          }
          return decodeEntities(String(s));
        }).filter(s => s && s.trim().length > 0);

        const id = this.slugify(parsed.meta.name || `recipe-${Date.now()}`);
        const recipe = {
          id,
          meta: parsed.meta,
          ingredients: parsed.ingredients,
          steps: parsed.steps || [],
          history: parsed.history || []
        };
        this.upsertRecipe(recipe);
        this.selectedId = id;
        this.loadRecipe();
        this.stepSignals = extractStepSignals(recipe.steps || []);
      } catch (e) {
        alert('YAML parse error: ' + e.message);
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
        const recipe = { id, ...mapped };
        this.upsertRecipe(recipe);
        this.selectedId = id;
        this.loadRecipe();
        this.stepSignals = extractStepSignals(recipe.steps || []);
      } catch (e) {
        alert('ORF import error: ' + e.message);
      }
    },

    saveYaml() {
      try {
        const copy = clone(this.current);
        delete copy.id;
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
      this.recipes = this.recipes.filter(r => r.id !== this.selectedId);
      localStorage.setItem('cookbook-recipes', JSON.stringify(this.recipes));
      this.hasUnsavedChanges = true;
      if (this.recipes.length > 0) {
        this.selectedId = this.recipes[0].id;
        this.loadRecipe();
      } else {
        this.current = { id: 'empty', meta: { name: 'No Recipe', source: '', base_servings: 1 }, ingredients: [], steps: [], science_notes: [] };
      }
    },

    downloadBackup() {
      const backup = {
        version: '1.0',
        exported: new Date().toISOString(),
        count: this.recipes.length,
        recipes: this.recipes
      };
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cookbook-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.hasUnsavedChanges = false;
      alert(`Backed up ${this.recipes.length} recipes`);
    },

    async downloadAllAsZip() {
      if (typeof JSZip === 'undefined') {
        alert('JSZip library not loaded. Please refresh the page.');
        return;
      }
      const zip = new JSZip();
      this.recipes.forEach(recipe => {
        const yaml = jsyaml.dump(recipe, { lineWidth: 120 });
        const filename = `${recipe.id}.yaml`;
        zip.file(filename, yaml);
      });
      const blob = await zip.generateAsync({type: 'blob'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cookbook-recipes-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      alert(`Downloaded ${this.recipes.length} recipes as YAML files`);
    },

    scaledQty(baseQty) {
      const base = Number(this.current.meta.base_servings) || 1;
      const qty = Number(baseQty) || 0;
      return (qty * this.servings) / base;
    },

    adjustServings() {
      const cap = this.isHighVolumeRecipe() ? 64 : 32;
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

    isHighVolumeRecipe() {
      const name = (this.current?.meta?.name || '').toLowerCase();
      const tags = ['cookie', 'cookies', 'appetizer', 'snack', 'dip', 'bars', 'brownie', 'punch'];
      return tags.some(t => name.includes(t));
    },

    findWWSub(ing) {
      if (!this.wwMode) return null;
      return ing.substitutions.find(sub => (sub.tags || []).includes('ww')) || null;
    },

    findVegSub(ing) {
      if (!this.vegMode) return null;
      const direct = ing.substitutions.find(sub => (sub.tags || []).includes('veg') || (sub.tags || []).includes('vegetarian'));
      if (direct) return direct;

      // Fallback to meat substitution library
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
        const first = options[0];
        return {
          name: first.name,
          ratio: first.ratio || 1,
          science_note: first.science_note || '',
          ww_points: first.ww_points || 0,
          tags: ['veg']
        };
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
        const vegSub = this.findVegSub(ing);
        const wwSub = this.findWWSub(ing);
        const baseName = sanitizeText(ing.name);
        const baseVol = sanitizeText(ing.vol_est);
        
        // Debug: log what we found
        if (vegSub || wwSub) {
          console.log(`[DEBUG] Suggestions for ${baseName}:`, {
            vegSub: vegSub?.name,
            wwSub: wwSub?.name,
            substitutions: ing.substitutions
          });
        }
        
        // No auto-swap; surface suggestions instead
        const shouldScale = ing.no_scale !== true;
        const qty = shouldScale ? this.scaledQty(ing.qty_g) : ing.qty_g;
        const nutrition = ingredientNutrition(baseName, qty);
        const nutritionTooltip = nutrition
          ? `${nutrition.calories} kcal • P ${nutrition.protein}g • F ${nutrition.fat}g • C ${nutrition.carbs}g${nutrition.fiber ? ' • Fiber ' + nutrition.fiber + 'g' : ''}`
          : '';
        
        // Prioritize veg, then ww
        const suggestion = vegSub
          ? { icon: '🌿', text: `Vegetarian: ${vegSub.name}${vegSub.science_note ? ' - ' + vegSub.science_note : ''}` }
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
          estimated: ing.estimated === true,
          nutrition,
          nutritionTooltip,
          suggestion
        };
      });
    },

    nutritionSummary() {
      const _v = this.nutritionVersion;
      const base = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
      this.displayIngredients().forEach(ing => {
        if (!ing.nutrition) return;
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
      return { total: base, per }; 
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
      const density = densityPerCup[name] || 240;
      const cups = grams / density;
      if (cups >= 1) {
        const val = roundToStep(cups, 0.25, 0.25);
        return `${toFractionQuarter(val)} cups`;
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
      const density = densityPerCup[name] || 240; // grams per cup
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
              return `${toFractionQuarter(count)} ${key}${count >= 2 ? 's' : ''}`;
            }
          }
        }
      }

      // Best-fit: for auto system, prefer volume for liquids/condiments
      if (!this.precisionMode && hasQty && this.prefs.system === 'auto' && prefersVolume(ingName)) {
        if (this.prefs.volumeUnit === 'ml') return this.gramToMl(ingName.toLowerCase(), qty);
        return this.gramToVolume(ingName.toLowerCase(), qty);
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
        const unitStr = units === 1 ? displayPref.unit : displayPref.unit;
        return `${trimZeros(units.toFixed(2))} ${unitStr}`;
      }

      if (this.precisionMode && hasQty) {
        if (this.prefs.weightUnit === 'oz') {
          const oz = this.gramToOunces(qty);
          const roundedOz = oz >= 8 ? roundToStep(oz, 0.1) : oz >= 1 ? roundToStep(oz, 0.05) : roundToStep(oz, 0.01, 0.01);
          const places = roundedOz >= 1 ? 1 : 2;
          return `${formatNumber(roundedOz, { max: places, min: 0 })} oz`;
        }
        const roundedG = qty >= 100 ? roundToStep(qty, 1) : qty >= 10 ? roundToStep(qty, 0.5) : roundToStep(qty, 0.1, 0.1);
        const places = roundedG >= 100 ? 0 : 1;
        return `${formatNumber(roundedG, { max: places, min: 0 })} g`;
      }

      // If no numeric qty, show vol_est if present
      if (!hasQty && ing.vol_est) return amountFromVolEst(ing.vol_est);

      // volume path
      if (this.prefs.volumeUnit === 'ml') return this.gramToMl(ingName.toLowerCase(), hasQty ? qty : 0);
      // cups/tbsp/tsp fallback
      return this.gramToVolume(ingName.toLowerCase(), hasQty ? qty : 0);
    },

    async copyRecipe() {
      const ingredients = this.displayIngredients()
        .map(ing => `• ${this.formatQuantity(ing)} ${ing.displayName}`.trim())
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
