document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS ---
    const BLUE_SPARK_OPTIONS = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
    const PINK_SPARK_OPTIONS = {
        terrain: ['Turf', 'Dirt'],
        distance: ['Sprint', 'Mile', 'Medium', 'Long'],
        strategy: ['Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'],
    };
    const WISH_RANK_ORDER = { S: 0, A: 1, B: 2, C: 3 };

    // --- STATE MANAGEMENT ---
    let goal = {
        primaryBlue: ['Stamina', 'Power'],
        primaryPink: ['Mile', 'Turf'],
        wishlist: [
            { name: "Groundwork", tier: 'S' },
            { name: "Mile Corners", tier: 'A' }
        ]
    };
    let roster = [];
    let nextGenNumber = 1;

    // --- DOM ELEMENTS ---
    const wishlistNameInput = document.getElementById('wishlist-name');
    const wishlistTierSelect = document.getElementById('wishlist-tier');
    const addWishlistBtn = document.getElementById('add-wishlist-btn');
    const wishlistContainer = document.getElementById('wishlist-container');
    
    const rosterContainer = document.getElementById('roster-container');
    const topParentsContainer = document.getElementById('top-parents-container');

    // Modal elements
    const addParentBtn = document.getElementById('add-parent-btn');
    const modal = document.getElementById('add-parent-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addParentForm = document.getElementById('add-parent-form');
    
    // Form inputs
    const umaNameInput = document.getElementById('uma-name');
    const blueSparkTypeSelect = document.getElementById('blue-spark-type');
    const blueSparkStarsSelect = document.getElementById('blue-spark-stars');
    const pinkSparkTypeSelect = document.getElementById('pink-spark-type');
    const pinkSparkStarsSelect = document.getElementById('pink-spark-stars');
    const modalWishlistSelect = document.getElementById('modal-wishlist-select');
    const modalWhiteStarsSelect = document.getElementById('modal-white-stars');
    const addModalWhiteBtn = document.getElementById('add-modal-white-btn');
    const modalWhiteSparksContainer = document.getElementById('modal-white-sparks-container');

    let currentWhiteSparks = [];

    // --- LOCAL STORAGE ---
    function loadState() {
        const savedGoal = localStorage.getItem('umaTrackerGoal');
        const savedRoster = localStorage.getItem('umaTrackerRoster');
        if (savedGoal) {
            const parsedGoal = JSON.parse(savedGoal);
            goal.primaryBlue = Array.isArray(parsedGoal.primaryBlue) ? parsedGoal.primaryBlue : [];
            goal.primaryPink = Array.isArray(parsedGoal.primaryPink) ? parsedGoal.primaryPink : [];
            goal.wishlist = parsedGoal.wishlist || [];
            
            // Migration for old numeric tiers
            goal.wishlist.forEach(item => {
                if (item.tier === 1) item.tier = 'S';
                if (item.tier === 2) item.tier = 'A';
                if (item.tier === 3) item.tier = 'B';
            });
        }
        if (savedRoster) roster = JSON.parse(savedRoster);
        
        // Determine the next generation number from the loaded roster
        if (roster.length > 0) {
            nextGenNumber = Math.max(...roster.map(p => p.gen)) + 1;
        } else {
            nextGenNumber = 1;
        }

        renderAll();
    }

    function saveState() {
        localStorage.setItem('umaTrackerGoal', JSON.stringify(goal));
        localStorage.setItem('umaTrackerRoster', JSON.stringify(roster));
    }

    // --- SCORING LOGIC ---
    function getScore(category, type, stars) {
        const points = {
            blue: { primary: [0, 2, 6, 10], secondary: [0, 1, 4, 8], other: [0, 1, 2, 3] },
            pink: { primary: [0, 3, 6, 10], other: [0, 1, 2, 3] },
            white: { 'S': [0, 5, 10, 15], 'A': [0, 2, 5, 8], 'B': [0, 1, 3, 5], 'C': [0, 1, 2, 3] }
        };

        if (category === 'blue') {
            const primaryBlueLower = goal.primaryBlue.map(s => s.toLowerCase());
            if (primaryBlueLower.includes(type.toLowerCase())) return points.blue.primary[stars];
            if (type.toLowerCase() === 'speed') return points.blue.secondary[stars];
            return points.blue.other[stars];
        } else if (category === 'pink') {
            const primaryPinkLower = goal.primaryPink.map(s => s.toLowerCase());
            if (primaryPinkLower.includes(type.toLowerCase())) return points.pink.primary[stars];
            return points.pink.other[stars];
        } else if (category === 'white') {
            return points.white[type] ? points.white[type][stars] : 0;
        }
        return 0;
    }

    function calculateScore(parent) {
        let totalScore = 0;
        totalScore += getScore('blue', parent.blueSpark.type, parent.blueSpark.stars);
        totalScore += getScore('pink', parent.pinkSpark.type, parent.pinkSpark.stars);
        parent.whiteSparks.forEach(spark => {
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            if (wishlistItem) {
                totalScore += getScore('white', wishlistItem.tier, spark.stars);
            }
        });
        return totalScore;
    }

    // --- RENDER FUNCTIONS ---
    function renderAll() {
        renderMultiSelects();
        renderWishlist();
        recalculateAllScores();
        renderRoster();
        renderTopParents();
        updateModalWishlist();
    }

    function recalculateAllScores() {
        roster.forEach(parent => {
            parent.score = calculateScore(parent);
        });
    }

    function renderWishlist() {
        wishlistContainer.innerHTML = '';
        if (goal.wishlist.length === 0) {
            wishlistContainer.innerHTML = `<p class="card__placeholder-text">No wishlist items yet.</p>`;
            return;
        }
        
        goal.wishlist.sort((a, b) => {
            const rankOrderA = WISH_RANK_ORDER[a.tier];
            const rankOrderB = WISH_RANK_ORDER[b.tier];
            if (rankOrderA < rankOrderB) return -1;
            if (rankOrderA > rankOrderB) return 1;
            return a.name.localeCompare(b.name);
        });

        goal.wishlist.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'wishlist__item';
            div.innerHTML = `
                <span class="wishlist__item-text">${item.name} <span class="wishlist__item-rank">(Rank ${item.tier})</span></span>
                <button data-name="${item.name}" class="wishlist__remove-btn">&times;</button>
            `;
            wishlistContainer.appendChild(div);
        });
    }

    function getSparkColor(type) {
        switch(type.toLowerCase()) {
            case 'speed': return 'bg-blue-100 text-blue-800';
            case 'stamina': return 'bg-yellow-100 text-yellow-800';
            case 'power': return 'bg-red-100 text-red-800';
            case 'guts': return 'bg-orange-100 text-orange-800';
            case 'wit': return 'bg-green-100 text-green-800';
            case 'sprint': case 'mile': case 'medium': case 'long': return 'bg-pink-100 text-pink-800';
            case 'turf': case 'dirt': return 'bg-purple-100 text-purple-800';
            default: return 'bg-indigo-100 text-indigo-800';
        }
    }
    
    function renderParentCard(parent, container, isTopParent = false) {
        const card = document.createElement('div');
        card.className = `parent-card ${isTopParent ? 'parent-card--top-pair' : ''}`;

        let blueSparkHTML = `<div class="spark-tag ${getSparkColor(parent.blueSpark.type)}">${parent.blueSpark.type} ${'★'.repeat(parent.blueSpark.stars)}</div>`;
        let pinkSparkHTML = `<div class="spark-tag ${getSparkColor(parent.pinkSpark.type)}">${parent.pinkSpark.type} ${'★'.repeat(parent.pinkSpark.stars)}</div>`;
        
        let whiteSparksHTML = parent.whiteSparks.map(spark => {
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? `Rank ${wishlistItem.tier}` : 'N/A';
            return `<div class="spark-tag bg-gray-200 text-gray-800">${spark.name} ${'★'.repeat(spark.stars)} <span class="parent-card__spark-tier">(${tier})</span></div>`;
        }).join('');

        card.innerHTML = `
            <div class="parent-card__header">
                <div>
                    <h3 class="parent-card__name">${parent.name} <span class="parent-card__gen">(Gen ${parent.gen})</span></h3>
                </div>
                <div class="parent-card__score-wrapper">
                     <div class="parent-card__score">${parent.score} pts</div>
                     ${!isTopParent ? `<button data-id="${parent.id}" class="parent-card__delete-btn">Delete</button>` : ''}
                </div>
            </div>
            <div class="parent-card__body">
                <div class="parent-card__spark-container">
                    ${blueSparkHTML}
                    ${pinkSparkHTML}
                </div>
                <div class="parent-card__spark-container parent-card__spark-container--white">
                    ${whiteSparksHTML || '<p class="parent-card__no-sparks-text">No wishlist white sparks.</p>'}
                </div>
            </div>
        `;
        container.appendChild(card);
    }

    function renderRoster() {
        rosterContainer.innerHTML = '';
        if (roster.length === 0) {
            rosterContainer.innerHTML = `<p class="card__placeholder-text text-center py-8">Your roster is empty. Add a parent to get started!</p>`;
            return;
        }
        roster.sort((a, b) => b.score - a.score);
        roster.forEach(parent => renderParentCard(parent, rosterContainer));
    }
    
    function renderTopParents() {
        topParentsContainer.innerHTML = '';
        if (roster.length === 0) {
            topParentsContainer.innerHTML = `<p class="card__placeholder-text">Add parents to your roster to see the top pair here.</p>`;
            return;
        }
        const topTwo = roster.slice(0, 2);
        topTwo.forEach(parent => renderParentCard(parent, topParentsContainer, true));
        if (roster.length === 1) {
            topParentsContainer.innerHTML += `<p class="card__placeholder-text text-sm mt-2">Add one more parent to complete the pair.</p>`;
        }
    }
    
    function updateModalWishlist() {
        modalWishlistSelect.innerHTML = goal.wishlist.map(w => `<option>${w.name}</option>`).join('');
        const allPinkOptions = [].concat(...Object.values(PINK_SPARK_OPTIONS));
        document.getElementById('pink-spark-type').innerHTML = allPinkOptions.map(o => `<option>${o}</option>`).join('');
    }

    // --- MULTI-SELECT LOGIC ---
    let openDropdown = null;

    function createMultiSelect(containerId, options, selectedValues, category) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        const inputDiv = document.createElement('div');
        inputDiv.className = 'multi-select__input';
        inputDiv.dataset.category = category;

        selectedValues.forEach(value => {
            const chip = document.createElement('div');
            chip.className = 'multi-select__chip';
            chip.innerHTML = `${value} <span class="multi-select__chip-remove" data-value="${value}">&times;</span>`;
            inputDiv.appendChild(chip);
        });

        const placeholder = document.createElement('span');
        if (selectedValues.length === 0) {
            placeholder.textContent = 'Select...';
            placeholder.className = 'text-gray-400 ml-2';
        }
        inputDiv.appendChild(placeholder);
        
        const dropdownDiv = document.createElement('div');
        dropdownDiv.className = 'multi-select__dropdown hidden';

        options.forEach(option => {
            const isChecked = selectedValues.includes(option);
            const label = document.createElement('label');
            label.className = 'multi-select__dropdown-item';
            label.innerHTML = `<input type="checkbox" class="mr-2" value="${option}" ${isChecked ? 'checked' : ''}> ${option}`;
            dropdownDiv.appendChild(label);
        });

        container.appendChild(inputDiv);
        container.appendChild(dropdownDiv);
    }

    function renderMultiSelects() {
        createMultiSelect('primary-blue-select', BLUE_SPARK_OPTIONS, goal.primaryBlue, 'blue');
        createMultiSelect('primary-pink-terrain-select', PINK_SPARK_OPTIONS.terrain, goal.primaryPink.filter(p => PINK_SPARK_OPTIONS.terrain.includes(p)), 'pink');
        createMultiSelect('primary-pink-distance-select', PINK_SPARK_OPTIONS.distance, goal.primaryPink.filter(p => PINK_SPARK_OPTIONS.distance.includes(p)), 'pink');
        createMultiSelect('primary-pink-strategy-select', PINK_SPARK_OPTIONS.strategy, goal.primaryPink.filter(p => PINK_SPARK_OPTIONS.strategy.includes(p)), 'pink');
    }

    document.body.addEventListener('click', e => {
        const container = e.target.closest('.multi-select');
        
        if (openDropdown && !openDropdown.contains(e.target)) {
            openDropdown.querySelector('.multi-select__dropdown').classList.add('hidden');
            openDropdown = null;
        }

        if (container) {
            const dropdown = container.querySelector('.multi-select__dropdown');
            const isHidden = dropdown.classList.contains('hidden');
            if (isHidden) {
                dropdown.classList.remove('hidden');
                openDropdown = container;
            } else {
                dropdown.classList.add('hidden');
                openDropdown = null;
            }
        }

        if (e.target.classList.contains('multi-select__chip-remove')) {
            const value = e.target.dataset.value;
            const category = e.target.closest('.multi-select__input').dataset.category;
            if (category === 'blue') {
                goal.primaryBlue = goal.primaryBlue.filter(v => v !== value);
            } else {
                goal.primaryPink = goal.primaryPink.filter(v => v !== value);
            }
            saveState();
            renderAll();
        }
    });

    document.body.addEventListener('change', e => {
        if (e.target.type === 'checkbox' && e.target.closest('.multi-select__dropdown')) {
            const value = e.target.value;
            const category = e.target.closest('.multi-select').querySelector('.multi-select__input').dataset.category;
            
            if (category === 'blue') {
                if (e.target.checked) goal.primaryBlue.push(value);
                else goal.primaryBlue = goal.primaryBlue.filter(v => v !== value);
            } else {
                if (e.target.checked) goal.primaryPink.push(value);
                else goal.primaryPink = goal.primaryPink.filter(v => v !== value);
            }
            saveState();
            renderAll();
        }
    });

    // --- EVENT LISTENERS ---
    addWishlistBtn.addEventListener('click', () => {
        const name = wishlistNameInput.value.trim();
        const tier = wishlistTierSelect.value;
        if (name) {
            goal.wishlist.push({ name, tier });
            wishlistNameInput.value = '';
            saveState();
            renderAll();
        }
    });

    wishlistContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('wishlist__remove-btn')) {
            const name = e.target.dataset.name;
            goal.wishlist = goal.wishlist.filter(item => item.name !== name);
            saveState();
            renderAll();
        }
    });

    rosterContainer.addEventListener('click', e => {
        if(e.target.classList.contains('parent-card__delete-btn')) {
            const id = e.target.dataset.id;
            roster = roster.filter(p => p.id != id);
            saveState();
            renderAll();
        }
    });

    // Modal Logic
    addParentBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        setTimeout(()=> {
           modal.classList.remove('opacity-0');
           modal.querySelector('.modal__content').classList.remove('transform', '-translate-y-10');
        }, 10);
    });
    
    const closeModal = () => {
        modal.classList.add('opacity-0');
        modal.querySelector('.modal__content').classList.add('transform', '-translate-y-10');
        setTimeout(()=> {
           modal.classList.add('hidden');
           addParentForm.reset();
           currentWhiteSparks = [];
           modalWhiteSparksContainer.innerHTML = '';
        }, 250);
    };

    closeModalBtn.addEventListener('click', closeModal);

    addModalWhiteBtn.addEventListener('click', () => {
        const name = modalWishlistSelect.value;
        const stars = parseInt(modalWhiteStarsSelect.value);
        if (name && !currentWhiteSparks.some(s => s.name === name)) {
            currentWhiteSparks.push({ name, stars });
            renderModalWhiteSparks();
        }
    });

    function renderModalWhiteSparks() {
        modalWhiteSparksContainer.innerHTML = '';
        currentWhiteSparks.forEach((spark, index) => {
            const div = document.createElement('div');
            div.className = 'obtained-spark';
            div.innerHTML = `
                <span>${spark.name} - ${'★'.repeat(spark.stars)}</span>
                <button type="button" data-index="${index}" class="obtained-spark__remove-btn">&times;</button>
            `;
            modalWhiteSparksContainer.appendChild(div);
        });
    }

    modalWhiteSparksContainer.addEventListener('click', e => {
        if(e.target.classList.contains('obtained-spark__remove-btn')) {
            const index = parseInt(e.target.dataset.index);
            currentWhiteSparks.splice(index, 1);
            renderModalWhiteSparks();
        }
    });

    addParentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newParent = {
            id: Date.now(),
            name: umaNameInput.value,
            gen: nextGenNumber,
            blueSpark: {
                type: blueSparkTypeSelect.value,
                stars: parseInt(blueSparkStarsSelect.value)
            },
            pinkSpark: {
                type: pinkSparkTypeSelect.value,
                stars: parseInt(pinkSparkStarsSelect.value)
            },
            whiteSparks: [...currentWhiteSparks],
            score: 0
        };
        newParent.score = calculateScore(newParent);
        roster.push(newParent);
        nextGenNumber++; // Increment for the next parent
        saveState();
        renderAll();
        closeModal();
    });

    // --- INITIAL LOAD ---
    loadState();
});