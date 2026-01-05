// Bookmarklet helper: copy the self-invoking string from the bottom into a bookmark's URL field.
// Logic: find JSON-LD recipe data, shape it to the template schema, serialize to YAML, copy to clipboard.
(async function bookmarklet() {
  try {
    const ldBlocks = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(el => {
        try { return JSON.parse(el.textContent); } catch (_) { return null; }
      })
      .flat()
      .filter(Boolean);

    const recipe = ldBlocks.find(node => {
      const type = node['@type'];
      if (Array.isArray(type)) return type.includes('Recipe');
      return type === 'Recipe';
    });

    if (!recipe) throw new Error('No JSON-LD recipe found');

    const toArray = val => Array.isArray(val) ? val : (val ? [val] : []);

    // Normalize ingredient names: convert Unicode fractions to ASCII, normalize all whitespace
    const normalizeName = (name) => {
      return String(name)
        .replace(/[\n\r\t\u00AD\u200B\u200C\u200D\u2060\xA0]+/g, ' ')  // Remove all types of whitespace
        .replace(/½/g, '1/2')
        .replace(/¼/g, '1/4')
        .replace(/¾/g, '3/4')
        .replace(/⅓/g, '1/3')
        .replace(/⅔/g, '2/3')
        .replace(/⅕/g, '1/5')
        .replace(/⅖/g, '2/5')
        .replace(/⅗/g, '3/5')
        .replace(/⅘/g, '4/5')
        .replace(/⅙/g, '1/6')
        .replace(/⅚/g, '5/6')
        .replace(/⅛/g, '1/8')
        .replace(/⅜/g, '3/8')
        .replace(/⅝/g, '5/8')
        .replace(/⅞/g, '7/8')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Extract weight in grams from ingredient name (handles "4 pounds/1.8 kilograms", etc.)
    const extractGramsFromName = (name) => {
      if (!name) return 0;
      const str = String(name).toLowerCase();
      
      // Explicit gram/kilogram values (e.g., "1.8 kilograms", "450 grams")
      const kgMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:kilograms?|kg)/);
      if (kgMatch) return Math.round(parseFloat(kgMatch[1]) * 1000);
      
      const gMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:grams?|g(?!\s*[a-z]))/);
      if (gMatch) return Math.round(parseFloat(gMatch[1]));
      
      // Pound/ounce conversions
      const lbMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:pounds?|lbs?)/);
      if (lbMatch) return Math.round(parseFloat(lbMatch[1]) * 453.592);
      
      const ozMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:ounces?|oz)/);
      if (ozMatch) return Math.round(parseFloat(ozMatch[1]) * 28.3495);
      
      // Volume conversions (tablespoons, teaspoons, cups)
      const tbspMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:tablespoons?|tbsp)/);
      if (tbspMatch) return Math.round(parseFloat(tbspMatch[1]) * 15); // ~15g per tbsp
      
      const tspMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:teaspoons?|tsp)/);
      if (tspMatch) return Math.round(parseFloat(tspMatch[1]) * 5); // ~5g per tsp
      
      const cupMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:cups?|cup)/);
      if (cupMatch) return Math.round(parseFloat(cupMatch[1]) * 240); // 240g per cup (default)
      
      return 0;
    };

    // Build ingredient list with deduplication and weight extraction
    const ingredientMap = new Map();
    toArray(recipe.recipeIngredient).forEach(raw => {
      const normalized = normalizeName(raw);
      if (!ingredientMap.has(normalized)) {
        ingredientMap.set(normalized, {
          name: normalized,
          qty_g: extractGramsFromName(normalized),  // Extract weight from name
          vol_est: normalized,
          function: '',
          ww_points: 0,
          substitutions: []
        });
      }
    });
    const ingredients = Array.from(ingredientMap.values());

    const steps = toArray(recipe.recipeInstructions).map(step => {
      if (typeof step === 'string') return step.trim();
      if (step && typeof step === 'object') return String(step.text || step['@type'] || '').trim();
      return '';
    }).filter(Boolean);

    // Try to extract source URL in multiple ways
    let sourceUrl = recipe.url || recipe.mainEntityOfPage;
    if (typeof sourceUrl === 'object') sourceUrl = sourceUrl['@id'] || sourceUrl.url || '';
    sourceUrl = sourceUrl || location.href;

    const yaml = [];
    yaml.push('meta:');
    yaml.push(`  name: ${recipe.name || 'Unknown Recipe'}`);
    yaml.push(`  source: ${sourceUrl}`);
    yaml.push(`  base_servings: ${recipe.recipeYield || 1}`);
    yaml.push(`  prep_time: ${recipe.totalTime || ''}`);
    yaml.push('ingredients:');
    ingredients.forEach(ing => {
      yaml.push(`  - name: ${ing.name}`);
      yaml.push(`    qty_g: ${ing.qty_g}`);
      yaml.push(`    vol_est: "${ing.vol_est}"`);
      yaml.push('    function: ');
      yaml.push('    ww_points: ');
      yaml.push('    substitutions: []');
    });
    yaml.push('steps:');
    steps.forEach(s => yaml.push(`  - ${s.replace(/\n/g, ' ')}`));
    yaml.push('history: []');

    const yamlText = yaml.join('\n');
    await navigator.clipboard.writeText(yamlText);
    alert('Recipe YAML copied to clipboard. Paste into your repo.');
  } catch (err) {
    alert('Bookmarklet error: ' + err.message);
  }
})();

// Bookmarklet URL (copy everything after "javascript:")
// javascript:(async()=>{try{const ld=[...document.querySelectorAll('script[type="application/ld+json"]')].map(e=>{try{return JSON.parse(e.textContent)}catch{return null}}).flat().filter(Boolean);const r=ld.find(n=>{const t=n['@type'];return Array.isArray(t)?t.includes('Recipe'):t==='Recipe'});if(!r)throw new Error('No JSON-LD recipe found');const toA=v=>Array.isArray(v)?v:(v?[v]:[]);const norm=name=>String(name).replace(/[\n\r\t]+/g,' ').replace(/½/g,'1/2').replace(/¼/g,'1/4').replace(/¾/g,'3/4').replace(/⅓/g,'1/3').replace(/⅔/g,'2/3').replace(/⅕/g,'1/5').replace(/⅖/g,'2/5').replace(/⅗/g,'3/5').replace(/⅘/g,'4/5').replace(/⅙/g,'1/6').replace(/⅚/g,'5/6').replace(/⅛/g,'1/8').replace(/⅜/g,'3/8').replace(/⅝/g,'5/8').replace(/⅞/g,'7/8').replace(/\s+/g,' ').trim();const m=new Map();toA(r.recipeIngredient).forEach(raw=>{const normalized=norm(raw);if(!m.has(normalized))m.set(normalized,{name:normalized,qty_g:0,vol_est:normalized,function:'',ww_points:0,substitutions:[]})});const ing=Array.from(m.values());const steps=toA(r.recipeInstructions).map(s=>typeof s==='string'?s.trim():String(s&&s.text||s&&s['@type']||'').trim()).filter(Boolean);let src=r.url||r.mainEntityOfPage;if(typeof src==='object')src=src['@id']||src.url||'';src=src||location.href;const y=[];y.push('meta:');y.push(`  name: ${r.name||'Unknown Recipe'}`);y.push(`  source: ${src}`);y.push(`  base_servings: ${r.recipeYield||1}`);y.push(`  prep_time: ${r.totalTime||''}`);y.push('ingredients:');ing.forEach(i=>{y.push(`  - name: ${i.name}`);y.push(`    qty_g: ${i.qty_g}`);y.push(`    vol_est: "${i.vol_est}"`);y.push('    function: ');y.push('    ww_points: ');y.push('    substitutions: []')});y.push('steps:');steps.forEach(s=>y.push(`  - ${s.replace(/\n/g,' ')}`));y.push('history: []');const txt=y.join('\n');await navigator.clipboard.writeText(txt);alert('Recipe YAML copied to clipboard. Paste into your repo.')}catch(e){alert('Bookmarklet error: '+e.message)}})();
