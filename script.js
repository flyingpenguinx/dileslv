/* ---------------------------------
   MOBILE NAV TOGGLE
--------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('show'));
  }
});

/* ---------------------------------
   FADE-IN ON SCROLL (Home)
--------------------------------- */
const fades = document.querySelectorAll('.fade-in');
if (fades.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  fades.forEach(el => io.observe(el));
}

/* ---------------------------------
   CATALOG LOGIC (Catalog page)
--------------------------------- */
const placeholderImg = 'images/placeholders/product-placeholder.jpg';

let rawData = null;      // products.json content
let sortedData = null;   // alphabetized, normalized

const categoryButtonsContainer = document.getElementById('category-buttons');
const subcatSectionsContainer = document.getElementById('subcategory-sections');
const productsView = document.getElementById('products-view');
const backToSubcatsBtn = document.getElementById('back-to-subcats');
const currentSubcatTitle = document.getElementById('current-subcategory-title');
const currentProductsGrid = document.getElementById('current-products-grid');

const searchBar = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResultsSection = document.getElementById('search-results');
const searchProductsGrid = document.getElementById('search-products-grid');
const noResults = document.getElementById('no-results');

// Only run catalog code on the catalog page
if (categoryButtonsContainer && subcatSectionsContainer) {
  // Load products.json
  fetch('products.json', { cache: 'no-store' })
    .then(res => res.json())
    .then(json => {
      rawData = json;
      sortedData = sortAll(json);
      renderCategories(sortedData);
      bindCategoryButtons();
      if (searchBar && searchBtn) {
        searchBtn.addEventListener('click', () => runGlobalSearch(searchBar.value));
        searchBar.addEventListener('input', () => runGlobalSearch(searchBar.value)); // instant search
      }
    })
    .catch(err => {
      console.error('Error loading products.json', err);
      if (noResults) {
        noResults.hidden = false;
        noResults.textContent = 'Failed to load catalog.';
      }
    });

  if (backToSubcatsBtn) {
    backToSubcatsBtn.addEventListener('click', () => {
      productsView.hidden = true;
      searchResultsSection.hidden = true;
      // Show the currently active category subcategories
      const active = categoryButtonsContainer.querySelector('.category-btn.active');
      if (active) {
        const cat = active.dataset.category;
        showCategory(cat);
      }
    });
  }
}

/* Alphabetize everything */
function sortAll(data) {
  const sorted = {};
  Object.keys(data).sort((a,b)=>a.localeCompare(b)).forEach(catName => {
    const subObj = data[catName] || {};
    const sortedSubs = {};
    Object.keys(subObj).sort((a,b)=>a.localeCompare(b)).forEach(subName => {
      const list = (subObj[subName] || []).slice().sort((x,y)=> (x.name||'').localeCompare(y.name||''));
      sortedSubs[subName] = list;
    });
    sorted[catName] = sortedSubs;
  });
  return sorted;
}

/* Render category buttons from data (ensures any future adds appear) */
function renderCategories(data) {
  if (!categoryButtonsContainer) return;
  categoryButtonsContainer.innerHTML = '';
  Object.keys(data).forEach((cat, idx) => {
    const btn = document.createElement('button');
    btn.className = 'category-btn' + (idx===0 ? ' active':'');
    btn.dataset.category = cat;
    btn.textContent = cat;
    categoryButtonsContainer.appendChild(btn);
  });
  // Render first category by default
  const first = Object.keys(data)[0];
  if (first) showCategory(first);
}

/* Bind clicks for category buttons */
function bindCategoryButtons() {
  const buttons = categoryButtonsContainer.querySelectorAll('.category-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showCategory(btn.dataset.category);
    });
  });
}

/* Show subcategories for a category and hide others */
function showCategory(categoryName) {
  if (!sortedData) return;
  productsView.hidden = true;
  searchResultsSection.hidden = true;

  // Build subcategory section
  subcatSectionsContainer.innerHTML = '';
  const subGrid = document.createElement('div');
  subGrid.className = 'subcategories-grid';

  const subObj = sortedData[categoryName] || {};
  const subNames = Object.keys(subObj);

  // Hide empty subcategories (no named products and no images)
  const visibleSubs = subNames.filter(sub => {
    const list = subObj[sub] || [];
    return list.some(p => (p.name && p.name.trim()) || (p.image && p.image.trim()));
  });

  if (!visibleSubs.length) {
    const empty = document.createElement('p');
    empty.className = 'no-products';
    empty.textContent = 'No subcategories found.';
    subcatSectionsContainer.appendChild(empty);
    return;
  }

  visibleSubs.forEach((subName) => {
    const card = document.createElement('div');
    card.className = 'subcategory-card';
    card.innerHTML = `<div class="product-name">${subName}</div>`;
    card.addEventListener('click', () => showSubcategory(categoryName, subName));
    subGrid.appendChild(card);
  });

  subcatSectionsContainer.appendChild(subGrid);
}

/* Show products in a given subcategory */
function showSubcategory(categoryName, subName) {
  if (!sortedData) return;
  const list = (sortedData[categoryName] && sortedData[categoryName][subName]) || [];

  // Only show products that have a name or an image
  const visibleProducts = list.filter(p => (p.name && p.name.trim()) || (p.image && p.image.trim()));

  subcatSectionsContainer.innerHTML = '';
  searchResultsSection.hidden = true;
  productsView.hidden = false;
  currentSubcatTitle.textContent = subName;
  currentProductsGrid.innerHTML = '';

  if (!visibleProducts.length) {
    const noEl = document.createElement('p');
    noEl.className = 'no-products';
    noEl.textContent = 'No products in this subcategory yet.';
    currentProductsGrid.appendChild(noEl);
    return;
  }

  visibleProducts.forEach(p => currentProductsGrid.appendChild(productCard(p)));
}

/* Create a product card element */
function productCard(product, highlightTerm = '') {
  const card = document.createElement('div');
  card.className = 'product-card';

  const src = (product.image && product.image.trim()) ? product.image : placeholderImg;

  const name = product.name || 'Unnamed Product';
  const safeName = highlightTerm ? highlight(name, highlightTerm) : escapeHTML(name);

  card.innerHTML = `
    <div class="product-image"><img src="${src}" alt="${escapeHTML(name)}"></div>
    <div class="product-name">${safeName}</div>
  `;
  return card;
}

/* Global search (categories, subcategories, products); sorted alphabetically */
function runGlobalSearch(q) {
  if (!sortedData) return;
  const query = (q || '').trim().toLowerCase();
  productsView.hidden = true;
  subcatSectionsContainer.innerHTML = '';
  searchResultsSection.hidden = false;
  searchProductsGrid.innerHTML = '';

  if (!query) {
    // If empty query, hide search results and show active category again
    searchResultsSection.hidden = true;
    const active = categoryButtonsContainer.querySelector('.category-btn.active');
    if (active) showCategory(active.dataset.category);
    return;
  }

  const matches = [];

  Object.keys(sortedData).forEach(cat => {
    const catMatch = cat.toLowerCase().includes(query);
    Object.keys(sortedData[cat]).forEach(sub => {
      const subMatch = sub.toLowerCase().includes(query);
      (sortedData[cat][sub] || []).forEach(p => {
        const name = (p.name || '').toLowerCase();
        const productMatch = name.includes(query);
        if (catMatch || subMatch || productMatch) {
          matches.push({ ...p });
        }
      });
    });
  });

  // Sort results by product name
  matches.sort((a,b)=> (a.name||'').localeCompare(b.name||''));

  if (!matches.length) {
    noResults.hidden = false;
    searchProductsGrid.innerHTML = '';
    return;
  }

  noResults.hidden = true;
  matches.forEach(m => searchProductsGrid.appendChild(productCard(m, query)));
}

/* Highlight search term inside a string (simple, safe) */
function highlight(text, term) {
  const esc = escapeRegExp(term);
  return escapeHTML(text).replace(new RegExp(esc, 'ig'), (m) => `<mark>${escapeHTML(m)}</mark>`);
}

/* Helpers */
function escapeHTML(s=''){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeRegExp(s=''){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
