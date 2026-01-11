/* Recipe browser Alpine component extracted from recipes-index.html to satisfy security scan */
function recipeBrowser() {
  return {
    recipes: [],
    filteredRecipes: [],
    searchQuery: '',
    minServings: 1,
    maxTime: '',
    hasScienceNotes: false,
    loading: true,

    async init() {
      try {
        const response = await fetch('recipes.json');
        if (!response.ok) throw new Error('Failed to load recipe index');
        const data = await response.json();
        this.recipes = data.recipes;
        this.filterRecipes();
      } catch (err) {
        console.error('Error loading recipes:', err);
        this.recipes = [];
      } finally {
        this.loading = false;
      }
    },

    filterRecipes() {
      this.filteredRecipes = this.recipes.filter(recipe => {
        // Search query
        if (this.searchQuery && !recipe.name.toLowerCase().includes(this.searchQuery.toLowerCase())) {
          return false;
        }

        // Min servings
        if (recipe.servings < this.minServings) {
          return false;
        }

        // Max time
        if (this.maxTime) {
          const timeMinutes = this.parseTime(recipe.prep_time);
          if (timeMinutes > parseInt(this.maxTime)) {
            return false;
          }
        }

        // Science notes filter
        if (this.hasScienceNotes && !recipe.has_science_notes) {
          return false;
        }

        return true;
      });
    },

    parseTime(timeStr) {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d+)([MH])/i);
      if (!match) return 0;
      const value = parseInt(match[1]);
      const unit = match[2].toUpperCase();
      return unit === 'H' ? value * 60 : value;
    }
  };
}
