const fetchCategories = async () => {
  try {
    const res = await fetch('http://localhost:3000/categories');
    const data = await res.json();

    console.log('loaded categories:', data);

    return data;
  } catch (error) {
    console.error('error:', error);
  }
};

const votingData = () => ({
  categories: [],
  isLoading: false,
  infiniteScrollObserver: null,
  displayedCategories: [],
  numberOfCategoriesToDisplay: 3,
  startCategoryIndex: 0,
  endCategoryIndex: 3,
  search: '',
  searchResults: [],
  searchedCategories: [],
  isSearchOpen: false,

  get areAllCategoriesDisplayed() {
    return this.displayedCategories.length === this.categories.length;
  },

  get hasSearchResults() {
    return this.search && this.searchResults.length > 0;
  },

  async init() {
    // load all categories
    this.isLoading = true;
    this.categories = await fetchCategories();
    this.isLoading = false;

    // display first categories
    this.updateDisplayedCategories();

    console.log('displayedCategories:', this.displayedCategories);

    // infinite scroll init
    this.createInfiniteScrollObserver();
    console.log('create new observer');

    this.$watch('areAllCategoriesDisplayed', (areAllCategoriesDisplayed) => {
      if (areAllCategoriesDisplayed) {
        // disconnect the observer when all categories are displayed
        if (!this.infiniteScrollObserver) return;

        this.infiniteScrollObserver.disconnect();
        this.infiniteScrollObserver = null;
        console.log('all categories displayed - disconnect observer');
      }
    });

    this.$watch('searchedCategories', (searchedCategories) => {
      if (searchedCategories.length > 0) {
        // disconnect the observer when search is performed
        if (!this.infiniteScrollObserver) return;

        this.infiniteScrollObserver.disconnect();
        this.infiniteScrollObserver = null;
        console.log('search is performed - disconnect observer');
      } else {
        // init new observer if not all categories are displayed
        if (this.areAllCategoriesDisplayed) return;
        if (this.infiniteScrollObserver) return;

        this.$nextTick(() => {
          setTimeout(() => {
            this.createInfiniteScrollObserver();
            console.log('create new observer');
          }, 100);
        });
      }
    });
  },

  updateDisplayedCategories() {
    this.displayedCategories = [
      ...this.displayedCategories,
      ...this.categories.slice(this.startCategoryIndex, this.endCategoryIndex),
    ];
    this.startCategoryIndex = this.endCategoryIndex;
    this.endCategoryIndex += this.numberOfCategoriesToDisplay;
  },

  createInfiniteScrollObserver() {
    const loadingIndicator = document.querySelector('#loading-indicator');

    const infiniteScrollCallback = async (entries, observer) => {
      const entry = entries[0];

      if (!entry.isIntersecting) return;

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 600);
      });

      // display next entries
      this.updateDisplayedCategories();

      console.log('displayedCategories:', this.displayedCategories);
    };

    this.infiniteScrollObserver = new IntersectionObserver(
      infiniteScrollCallback,
      { threshold: 1 }
    );

    this.infiniteScrollObserver.observe(loadingIndicator);
  },

  toggleSearch() {
    this.isSearchOpen = !this.isSearchOpen;

    this.$nextTick(() => {
      if (this.isSearchOpen) {
        setTimeout(() => {
          document.getElementById('search-input').focus();
        }, 50);
      }
    });
  },

  resetSearch() {
    this.search = '';
    this.searchResults = [];
    this.searchedCategories = [];
  },

  handleSearch(e) {
    if (this.search === '') {
      this.resetSearch();
      return;
    }

    const categories = JSON.parse(JSON.stringify(this.categories));
    const searchResults = [];

    const testString = (str) => {
      return str.toLowerCase().includes(this.search.toLowerCase());
    };

    categories.forEach((category) => {
      // test category' entries
      const searchedEntries = category.entries.filter((entry) => {
        return (
          testString(entry.title) ||
          testString(entry.description) ||
          (entry.produced_by ? testString(entry.produced_by) : false) ||
          (entry.client ? testString(entry.client) : false)
        );
      });

      // add entries to searchResults
      if (searchedEntries.length > 0) {
        searchedEntries.forEach((e) => {
          searchResults.push({
            title: e.title,
            slug: e.slug,
            category: { title: category.title, slug: category.slug },
            type: 'Entry',
          });
        });
        return;
      }

      // if no entries found - test category title
      if (testString(category.title)) {
        searchResults.push({
          title: category.title,
          slug: category.slug,
          type: 'Category',
        });
      }
    });

    console.log('searchedResults:', searchResults);

    this.searchResults = searchResults;
  },

  handleSearchResult(result) {
    let searchedCategory;

    const getCategory = (slug) => {
      return JSON.parse(
        JSON.stringify(this.categories.find((c) => c.slug === slug))
      );
    };

    if (result.type === 'Category') {
      searchedCategory = getCategory(result.slug);
    } else if (result.type === 'Entry') {
      searchedCategory = getCategory(result.category.slug);

      const entry = searchedCategory.entries.find(
        (e) => e.slug === result.slug
      );

      searchedCategory.entries = [entry];
    }

    console.log('searchedCategory:', searchedCategory);

    this.isSearchOpen = false;
    this.searchedCategories = [searchedCategory];
  },
});

// alpine init
document.addEventListener('alpine:init', () => {
  console.log('alpine init');
  Alpine.data('voting', votingData);
});
