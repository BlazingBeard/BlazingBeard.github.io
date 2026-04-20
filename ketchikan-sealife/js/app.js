/**
 * Ketchikan Sealife Field Guide — Static App
 * All data in SPECIES_DATA (species-data.js), user data in localStorage/IndexedDB.
 */

(function() {
    'use strict';

    // ── State ──
    let allSpecies = [];
    let filteredSpecies = [];
    let currentIndex = 0;
    let currentCategory = 'all';
    let touchStartX = 0;
    let touchDeltaX = 0;
    let isSwiping = false;
    let currentView = 'species'; // 'species' | 'sightings' | 'new'
    let db = null; // IndexedDB

    // ── DOM refs ──
    const $ = id => document.getElementById(id);
    const card = $('species-card');
    const cardContainer = $('card-container');
    const cardImg = $('card-img');
    const cardPlaceholder = $('card-placeholder');
    const cardCommonName = $('card-common-name');
    const cardScientificName = $('card-scientific-name');
    const cardCategory = $('card-category');
    const cardDescription = $('card-description');
    const cardHabitat = $('card-habitat');
    const cardTips = $('card-tips');
    const positionCounter = $('position-counter');
    const searchInput = $('search-input');
    const searchResults = $('search-results');
    const categoryChips = $('category-chips');
    const btnPrev = $('btn-prev');
    const btnNext = $('btn-next');
    const commentsSection = $('comments-section');
    const commentsList = $('comments-list');
    const commentInput = $('comment-input');
    const btnComment = $('btn-comment');
    const sightingsView = $('sightings-view');
    const newSightingView = $('new-sighting-view');
    const sightingForm = $('sighting-form');

    // ── IndexedDB ──
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('KetchikanSealife', 2);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('sightings')) {
                    const store = db.createObjectStore('sightings', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('species_id', 'species_id');
                }
                if (!db.objectStoreNames.contains('photos')) {
                    db.createObjectStore('photos', { keyPath: 'sightingId' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function idbPut(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function idbGetAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function idbGet(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function idbDelete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    // ── Username ──
    function getUsername() {
        return localStorage.getItem('sealife_username') || '';
    }

    function ensureUsername() {
        return new Promise((resolve) => {
            const name = getUsername();
            if (name) { resolve(name); return; }
            const modal = $('username-modal');
            modal.classList.remove('hidden');
            const input = $('username-input');
            const btn = $('username-save');
            const handler = () => {
                const val = input.value.trim();
                if (val) {
                    localStorage.setItem('sealife_username', val);
                    modal.classList.add('hidden');
                    updateNavUser();
                    resolve(val);
                }
            };
            btn.onclick = handler;
            input.onkeydown = (e) => { if (e.key === 'Enter') handler(); };
            input.focus();
        });
    }

    function updateNavUser() {
        const name = getUsername();
        const el = $('nav-username');
        if (el) el.textContent = name ? name.substring(0, 8) : 'Guest';
    }

    // ── Toast ──
    function toast(msg) {
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    // ── Comments (localStorage) ──
    function getComments(speciesId) {
        try {
            const all = JSON.parse(localStorage.getItem('sealife_comments') || '{}');
            return all[speciesId] || [];
        } catch { return []; }
    }

    function addComment(speciesId, body) {
        const all = JSON.parse(localStorage.getItem('sealife_comments') || '{}');
        if (!all[speciesId]) all[speciesId] = [];
        all[speciesId].push({
            author: getUsername() || 'Anonymous',
            body: body,
            created_at: new Date().toISOString()
        });
        localStorage.setItem('sealife_comments', JSON.stringify(all));
    }

    // ── Init ──
    async function init() {
        db = await openDB();
        allSpecies = SPECIES_DATA;
        filteredSpecies = [...allSpecies];

        buildCategoryChips();
        setupSwipe();
        setupSearch();
        setupNavButtons();
        setupComments();
        setupSightingForm();
        setupPhotoPreview();
        setupBottomNav();
        setupDataActions();
        updateNavUser();

        // Check URL hash for view
        const hash = window.location.hash.replace('#', '');
        if (hash === 'sightings') {
            switchView('sightings');
        } else if (hash === 'new') {
            switchView('new');
        } else {
            switchView('species');
        }

        if (filteredSpecies.length > 0) renderCard(0);
    }

    // ── Category chips ──
    function buildCategoryChips() {
        CATEGORIES.forEach(cat => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.dataset.category = cat;
            chip.textContent = cat;
            chip.addEventListener('click', () => selectCategory(cat));
            categoryChips.appendChild(chip);
        });
    }

    // ── View switching ──
    function switchView(view) {
        currentView = view;

        const speciesEls = [cardContainer, positionCounter, commentsSection,
                            document.querySelector('.search-bar'), categoryChips];
        const show = (els, visible) => els.forEach(el => { if (el) el.classList.toggle('hidden', !visible); });

        show(speciesEls, view === 'species');
        if (sightingsView) sightingsView.classList.toggle('hidden', view !== 'sightings');
        if (newSightingView) newSightingView.classList.toggle('hidden', view !== 'new');

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`[data-view="${view}"]`);
        if (activeNav) activeNav.classList.add('active');

        if (view === 'sightings') loadSightings();
        if (view === 'new') populateSpeciesSelect();

        window.location.hash = view === 'species' ? '' : view;
    }

    function setupBottomNav() {
        document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(btn.dataset.view);
            });
        });
    }

    // ── Card rendering ──
    function renderCard(index) {
        if (filteredSpecies.length === 0) {
            cardCommonName.textContent = 'No species found';
            cardScientificName.textContent = '';
            cardCategory.textContent = '';
            cardDescription.textContent = '';
            cardHabitat.textContent = '';
            cardTips.textContent = '';
            cardImg.classList.remove('loaded');
            cardPlaceholder.style.display = 'block';
            positionCounter.textContent = '0 / 0';
            return;
        }

        currentIndex = Math.max(0, Math.min(index, filteredSpecies.length - 1));
        const species = filteredSpecies[currentIndex];

        cardCommonName.textContent = species.common_name;
        cardScientificName.textContent = species.scientific_name || '';
        cardCategory.textContent = species.category + (species.subcategory ? ' \u2014 ' + species.subcategory : '');
        cardDescription.textContent = species.description || '';
        cardHabitat.textContent = species.habitat || '';
        cardTips.textContent = species.identification_tips || '';

        if (species.image_filename) {
            cardImg.src = 'img/' + species.image_filename;
            cardImg.classList.add('loaded');
            cardPlaceholder.style.display = 'none';
            cardImg.onerror = () => {
                cardImg.classList.remove('loaded');
                cardPlaceholder.style.display = 'block';
            };
        } else {
            cardImg.classList.remove('loaded');
            cardPlaceholder.style.display = 'block';
        }

        positionCounter.textContent = `${currentIndex + 1} / ${filteredSpecies.length}`;
        renderComments(species.id);
    }

    // ── Swipe ──
    function setupSwipe() {
        cardContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            isSwiping = true;
            card.classList.add('swiping');
        }, { passive: true });

        cardContainer.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            touchDeltaX = e.touches[0].clientX - touchStartX;
            card.style.transform = `translateX(${touchDeltaX}px) rotate(${touchDeltaX * 0.03}deg)`;
            card.style.opacity = Math.max(0.5, 1 - Math.abs(touchDeltaX) / 400);
        }, { passive: true });

        cardContainer.addEventListener('touchend', () => {
            if (!isSwiping) return;
            isSwiping = false;
            card.classList.remove('swiping');
            const threshold = 80;

            if (touchDeltaX < -threshold && currentIndex < filteredSpecies.length - 1) {
                animateSwipe('left', () => renderCard(currentIndex + 1));
            } else if (touchDeltaX > threshold && currentIndex > 0) {
                animateSwipe('right', () => renderCard(currentIndex - 1));
            } else {
                card.style.transform = '';
                card.style.opacity = '';
            }
            touchDeltaX = 0;
        });
    }

    function animateSwipe(direction, callback) {
        card.classList.add(direction === 'left' ? 'swipe-left' : 'swipe-right');
        setTimeout(() => {
            card.classList.remove('swipe-left', 'swipe-right');
            card.style.transform = '';
            card.style.opacity = '';
            callback();
        }, 250);
    }

    // ── Nav buttons ──
    function setupNavButtons() {
        btnPrev.addEventListener('click', () => {
            if (currentIndex > 0) animateSwipe('right', () => renderCard(currentIndex - 1));
        });
        btnNext.addEventListener('click', () => {
            if (currentIndex < filteredSpecies.length - 1) animateSwipe('left', () => renderCard(currentIndex + 1));
        });
    }

    // ── Search (client-side) ──
    function setupSearch() {
        let timeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            const q = searchInput.value.trim().toLowerCase();

            if (!q) {
                searchResults.classList.add('hidden');
                filteredSpecies = currentCategory === 'all'
                    ? [...allSpecies]
                    : allSpecies.filter(s => s.category === currentCategory);
                renderCard(0);
                return;
            }

            timeout = setTimeout(() => {
                const results = allSpecies.filter(s =>
                    s.common_name.toLowerCase().includes(q) ||
                    (s.scientific_name && s.scientific_name.toLowerCase().includes(q)) ||
                    (s.description && s.description.toLowerCase().includes(q))
                );

                if (results.length === 0) {
                    searchResults.innerHTML = '<div class="search-result-item"><span class="result-name">No results</span></div>';
                } else {
                    searchResults.innerHTML = results.map((s, i) => `
                        <div class="search-result-item" data-index="${i}">
                            <span class="result-name">${esc(s.common_name)}</span>
                            <span class="result-category">${esc(s.category)}${s.subcategory ? ' \u2014 ' + esc(s.subcategory) : ''}</span>
                        </div>
                    `).join('');

                    searchResults.querySelectorAll('.search-result-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const idx = parseInt(item.dataset.index);
                            filteredSpecies = results;
                            renderCard(idx);
                            searchResults.classList.add('hidden');
                        });
                    });
                }
                searchResults.classList.remove('hidden');
            }, 200);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar')) searchResults.classList.add('hidden');
        });
    }

    // ── Categories ──
    function selectCategory(category) {
        currentCategory = category;
        categoryChips.querySelectorAll('.chip').forEach(c => {
            c.classList.toggle('active', c.dataset.category === category || (category === 'all' && c.dataset.category === 'all'));
        });

        if (category === 'all') {
            filteredSpecies = [...allSpecies];
            categoryChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            categoryChips.querySelector('[data-category="all"]').classList.add('active');
        } else {
            filteredSpecies = allSpecies.filter(s => s.category === category);
            categoryChips.querySelector('[data-category="all"]').classList.remove('active');
        }

        currentIndex = 0;
        renderCard(0);
        searchInput.value = '';
        searchResults.classList.add('hidden');
    }

    // ── Comments ──
    function setupComments() {
        btnComment.addEventListener('click', async () => {
            const body = commentInput.value.trim();
            if (!body || filteredSpecies.length === 0) return;
            const username = getUsername();
            if (!username) {
                await ensureUsername();
                if (!getUsername()) return;
            }
            const speciesId = filteredSpecies[currentIndex].id;
            addComment(speciesId, body);
            commentInput.value = '';
            renderComments(speciesId);
        });
    }

    function renderComments(speciesId) {
        const comments = getComments(speciesId);
        if (comments.length === 0) {
            commentsList.innerHTML = '<p style="font-size:13px;color:var(--text-muted);">No comments yet.</p>';
        } else {
            commentsList.innerHTML = comments.map(c => `
                <div class="comment-item">
                    <span class="comment-author">${esc(c.author)}</span>
                    <p class="comment-body">${esc(c.body)}</p>
                    <span class="comment-time">${formatDate(c.created_at)}</span>
                </div>
            `).join('');
        }
    }

    // ── Sightings (IndexedDB) ──
    async function loadSightings() {
        const list = $('sightings-list');
        try {
            const sightings = await idbGetAll('sightings');
            sightings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            if (sightings.length === 0) {
                list.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No sightings yet. Go explore!</p>';
            } else {
                let html = '';
                for (const s of sightings) {
                    const speciesName = s.species_id ? (allSpecies.find(sp => sp.id === s.species_id) || {}).common_name || '' : '';
                    let photoHtml = '';
                    if (s.hasPhoto) {
                        const photo = await idbGet('photos', s.id);
                        if (photo && photo.data) {
                            photoHtml = `<img class="sighting-photo" src="${photo.data}" alt="Sighting photo">`;
                        }
                    }
                    html += `
                        <div class="sighting-item">
                            <button class="sighting-delete" data-id="${s.id}" title="Delete">&times;</button>
                            <h3>${esc(s.title)}</h3>
                            <p class="sighting-meta">
                                ${speciesName ? '\uD83D\uDC1A ' + esc(speciesName) + ' \u00b7 ' : ''}
                                ${s.location_text ? esc(s.location_text) : ''}
                                ${s.created_at ? ' \u00b7 ' + formatDate(s.created_at) : ''}
                            </p>
                            ${s.notes ? '<p style="font-size:14px;margin-top:6px;">' + esc(s.notes) + '</p>' : ''}
                            ${photoHtml}
                        </div>`;
                }
                list.innerHTML = html;

                list.querySelectorAll('.sighting-delete').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = Number(btn.dataset.id);
                        if (confirm('Delete this sighting?')) {
                            await idbDelete('sightings', id);
                            try { await idbDelete('photos', id); } catch {}
                            loadSightings();
                        }
                    });
                });
            }
        } catch (e) {
            list.innerHTML = '<p style="color:var(--danger);">Failed to load sightings.</p>';
        }
    }

    function populateSpeciesSelect() {
        const select = $('sighting-species');
        if (!select || select.options.length > 1) return;
        allSpecies.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.common_name} (${s.category})`;
            select.appendChild(opt);
        });
    }

    function setupSightingForm() {
        if (!sightingForm) return;

        sightingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = getUsername();
            if (!username) {
                await ensureUsername();
                if (!getUsername()) return;
            }

            const title = $('sighting-title').value.trim();
            if (!title) return;

            const speciesId = $('sighting-species').value ? Number($('sighting-species').value) : null;
            const notes = $('sighting-notes').value.trim();
            const location = $('sighting-location').value.trim();
            const lat = $('sighting-lat').value || null;
            const lng = $('sighting-lng').value || null;

            const photoInput = $('sighting-photo');
            let hasPhoto = false;
            let photoData = null;

            if (photoInput.files[0]) {
                hasPhoto = true;
                photoData = await readFileAsDataURL(photoInput.files[0]);
            }

            const sighting = {
                title,
                species_id: speciesId,
                notes,
                location_text: location,
                latitude: lat,
                longitude: lng,
                author: getUsername(),
                hasPhoto,
                created_at: new Date().toISOString()
            };

            const id = await idbPut('sightings', sighting);

            if (hasPhoto && photoData) {
                // id is auto-generated; re-read to get it
                const all = await idbGetAll('sightings');
                const saved = all[all.length - 1];
                if (saved) {
                    await idbPut('photos', { sightingId: saved.id, data: photoData });
                    saved.hasPhoto = true;
                    await idbPut('sightings', saved);
                }
            }

            sightingForm.reset();
            $('photo-preview').classList.add('hidden');
            toast('Sighting saved!');
            switchView('sightings');
        });

        // Geolocation
        const btnGeo = $('btn-geolocate');
        if (btnGeo) {
            btnGeo.addEventListener('click', () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        $('sighting-lat').value = pos.coords.latitude;
                        $('sighting-lng').value = pos.coords.longitude;
                        $('sighting-location').value =
                            `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
                    }, () => toast('Could not get location'));
                }
            });
        }
    }

    function setupPhotoPreview() {
        const input = $('sighting-photo');
        const preview = $('photo-preview');
        const previewImg = $('photo-preview-img');
        if (input) {
            input.addEventListener('change', () => {
                const file = input.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImg.src = e.target.result;
                        preview.classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                } else {
                    preview.classList.add('hidden');
                }
            });
        }
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    // ── Export / Import ──
    function setupDataActions() {
        const btnExport = $('btn-export');
        const btnImport = $('btn-import');
        const fileImport = $('file-import');

        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                const sightings = await idbGetAll('sightings');
                const comments = JSON.parse(localStorage.getItem('sealife_comments') || '{}');
                const username = getUsername();
                const data = { version: 1, username, sightings, comments, exported_at: new Date().toISOString() };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'sealife-data.json';
                a.click();
                URL.revokeObjectURL(a.href);
                toast('Data exported!');
            });
        }

        if (btnImport && fileImport) {
            btnImport.addEventListener('click', () => fileImport.click());
            fileImport.addEventListener('change', async () => {
                const file = fileImport.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (data.username) localStorage.setItem('sealife_username', data.username);
                    if (data.comments) localStorage.setItem('sealife_comments', JSON.stringify(data.comments));
                    if (data.sightings) {
                        for (const s of data.sightings) {
                            await idbPut('sightings', s);
                        }
                    }
                    updateNavUser();
                    toast('Data imported!');
                    if (currentView === 'sightings') loadSightings();
                    if (currentView === 'species' && filteredSpecies.length > 0) renderComments(filteredSpecies[currentIndex].id);
                } catch (e) {
                    toast('Failed to import — invalid file');
                }
                fileImport.value = '';
            });
        }
    }

    // ── Utilities ──
    function esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Start
    init();
})();
