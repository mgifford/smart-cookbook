// Load all recipes from YAML files in the /recipes/ directory
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('load-recipes-btn');
  const status = document.getElementById('load-recipes-status');

  if (!btn) return; // Button not found

  btn.addEventListener('click', async function() {
    btn.disabled = true;
    btn.textContent = '📥 Loading...';
    status.textContent = '';

    const recipeFiles = [
      'lasagna.yaml',
      'smooth-vegetable-soup.yaml',
      'superb-squash-soup.yaml',
      'broccoli-basil-soup.yaml',
      'broccoli-greens-soup.yaml',
      'creamy-potato-soup-high-fibre.yaml',
      'creamy-potato-soup-low-fibre.yaml',
      'creamy-potato-leek-soup.yaml',
      'foundation-broth.yaml',
      'vegetable-soup-butter-beans.yaml'
    ];

    const recipes = [];

    for (const file of recipeFiles) {
      try {
        const response = await fetch(`recipes/${file}`);
        if (!response.ok) {
          console.warn(`Failed to load ${file}: ${response.status}`);
          continue;
        }

        const yaml = await response.text();
        const recipe = window.jsyaml?.load(yaml);
        
        if (recipe) {
          // Generate ID from filename
          const id = file.replace('.yaml', '');
          recipe.id = id;
          recipes.push(recipe);
          console.log(`✓ Loaded: ${recipe.meta?.name || file}`);
        }
      } catch (error) {
        console.error(`Error loading ${file}:`, error);
      }
    }

    if (recipes.length > 0) {
      // Save to localStorage
      try {
        localStorage.setItem('cookbook-recipes', JSON.stringify(recipes));
        console.log(`✓ Saved ${recipes.length} recipes to localStorage`);
        
        btn.textContent = '✓ Loaded!';
        status.textContent = `✓ Loaded ${recipes.length} recipes. Reloading...`;
        status.style.color = '#10b981';
        
        // Reload the page to display the recipes
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error('Failed to save recipes to localStorage:', error);
        btn.disabled = false;
        btn.textContent = '📥 Load All Recipes';
        status.textContent = '❌ Error saving to localStorage';
        status.style.color = '#ef4444';
      }
    } else {
      btn.disabled = false;
      btn.textContent = '📥 Load All Recipes';
      status.textContent = '❌ No recipes were loaded';
      status.style.color = '#ef4444';
    }
  });
});
