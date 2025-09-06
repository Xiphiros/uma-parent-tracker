document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTS ---
    const BLUE_SPARK_OPTIONS = ['Speed', 'Stamina', 'Power', 'Guts', 'Wit'];
    const PINK_SPARK_OPTIONS = {
        terrain: ['Turf', 'Dirt'],
        distance: ['Sprint', 'Mile', 'Medium', 'Long'],
        strategy: ['Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'],
    };
    const WISH_RANK_ORDER = { S: 0, A: 1, B: 2, C: 3 };
    const DB_KEY = 'umaTrackerData_v2';

    // --- STATE MANAGEMENT ---
    let appData = {
        version: 2,
        activeProfileId: null,
        profiles: []
    };
    let editingParentId = null;

    // --- DOM ELEMENTS ---
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');
    
    const tabsList = document.getElementById('tabs-list');
    const addProfileBtn = document.getElementById('add-profile-btn');

    const wishlistNameInput = document.getElementById('wishlist-name');
    const wishlistTierSelect = document.getElementById('wishlist-tier');
    const addWishlistBtn = document.getElementById('add-wishlist-btn');
    const wishlistContainer = document.getElementById('wishlist-container');
    
    const rosterContainer = document.getElementById('roster-container');
    const topParentsContainer = document.getElementById('top-parents-container');

    // Main Modal elements
    const addParentBtn = document.getElementById('add-parent-btn');
    const modal = document.getElementById('add-parent-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addParentForm = document.getElementById('add-parent-form');
    const saveParentBtn = document.getElementById('save-parent-btn');
    const genDisplay = document.getElementById('gen-display');
    const genDisplayText = document.getElementById('gen-display-text');
    
    // Main Modal Form inputs
    const umaNameInput = document.getElementById('uma-name');
    const blueSparkTypeSelect = document.getElementById('blue-spark-type');
    const blueSparkStarsSelect = document.getElementById('blue-spark-stars');
    const pinkSparkTypeSelect = document.getElementById('pink-spark-type');
    const pinkSparkStarsSelect = document.getElementById('pink-spark-stars');
    const modalWishlistSelect = document.getElementById('modal-wishlist-select');
    const modalWhiteStarsSelect = document.getElementById('modal-white-stars');
    const addModalWhiteBtn = document.getElementById('add-modal-white-btn');
    const modalWhiteSparksContainer = document.getElementById('modal-white-sparks-container');

    // Skill Mini-Modal elements
    const showAddSkillModalBtn = document.getElementById('show-add-skill-modal-btn');
    const addSkillModal = document.getElementById('add-skill-modal');
    const addSkillForm = document.getElementById('add-skill-form');
    const newSkillNameInput = document.getElementById('new-skill-name');
    const newSkillTierSelect = document.getElementById('new-skill-tier');
    const cancelAddSkillBtn = document.getElementById('cancel-add-skill-btn');

    // Wishlist Management Modal elements
    const manageWishlistBtn = document.getElementById('manage-wishlist-btn');
    const wishlistManagementModal = document.getElementById('wishlist-management-modal');
    const wishlistManagementList = document.getElementById('wishlist-management-list');
    const closeWishlistModalBtn = document.getElementById('close-wishlist-modal-btn');
    const doneWishlistModalBtn = document.getElementById('done-wishlist-modal-btn');

    // Generic Dialog Modal elements
    const dialogModal = document.getElementById('dialog-modal');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogInputContainer = document.getElementById('dialog-input-container');
    const dialogInput = document.getElementById('dialog-input');
    const dialogFooter = document.getElementById('dialog-footer');

    let currentWhiteSparks = [];

    // --- DIALOG SERVICE ---
    class DialogService {
        constructor() {
            this._resolve = null;
            dialogFooter.addEventListener('click', (e) => this._handleButtonClick(e));
        }

        _handleButtonClick(e) {
            const button = e.target.closest('button');
            if (!button || !this._resolve) return;

            const value = button.dataset.value;

            if (value === 'prompt') {
                this._resolve(dialogInput.value);
            } else if(value === 'true') {
                this._resolve(true);
            } else {
                this._resolve(false);
            }
            this._hide();
        }

        _show(title, message, buttons, input) {
            return new Promise(resolve => {
                this._resolve = resolve;
                dialogTitle.textContent = title;
                dialogMessage.textContent = message;
                dialogFooter.innerHTML = buttons;

                if (input) {
                    dialogInputContainer.classList.remove('hidden');
                    dialogInput.value = input.defaultValue || '';
                } else {
                    dialogInputContainer.classList.add('hidden');
                }

                dialogModal.classList.remove('hidden');
                setTimeout(() => dialogModal.classList.remove('opacity-0'), 10);
                if (input) dialogInput.focus();
            });
        }

        _hide() {
            this._resolve = null;
            dialogModal.classList.add('opacity-0');
            setTimeout(() => dialogModal.classList.add('hidden'), 250);
        }

        alert(message, title = 'Alert') {
            const buttons = `<button class="button button--primary" data-value="true">OK</button>`;
            return this._show(title, message, buttons);
        }

        confirm(message, title = 'Confirm') {
            const buttons = `
                <button class="button button--neutral" data-value="false">Cancel</button>
                <button class="button button--primary" data-value="true">Confirm</button>
            `;
            return this._show(title, message, buttons);
        }

        prompt(message, title = 'Input Required', defaultValue = '') {
            const buttons = `
                <button class="button button--neutral" data-value="false">Cancel</button>
                <button class="button button--primary" data-value="prompt">OK</button>
            `;
            return this._show(title, message, buttons, { defaultValue });
        }
    }
    const Dialog = new DialogService();
    
    // --- HELPERS ---
    const getActiveProfile = () => appData.profiles.find(p => p.id === appData.activeProfileId);
    const getNextGenNumber = () => {
        const roster = getActiveProfile()?.roster || [];
        return roster.length > 0 ? Math.max(...roster.map(p => p.gen)) + 1 : 1;
    }

    // --- DATA MIGRATION & STORAGE ---
    function migrateV1Data() {
        console.log("Checking for V1 data...");
        const oldGoal = localStorage.getItem('umaTrackerGoal');
        const oldRoster = localStorage.getItem('umaTrackerRoster');

        if (oldGoal || oldRoster) {
            console.log("V1 data found. Migrating...");
            const newProfile = createNewProfile("Default Project");
            if(oldGoal) newProfile.goal = JSON.parse(oldGoal);
            if(oldRoster) newProfile.roster = JSON.parse(oldRoster);
            
            appData.profiles.push(newProfile);
            appData.activeProfileId = newProfile.id;
            
            saveState();
            localStorage.removeItem('umaTrackerGoal');
            localStorage.removeItem('umaTrackerRoster');
            console.log("Migration complete.");
            return true;
        }
        return false;
    }
    
    function loadState() {
        const savedData = localStorage.getItem(DB_KEY);
        if (savedData) {
            appData = JSON.parse(savedData);
        } else {
            if (!migrateV1Data()) {
                // If no data exists at all, create a first profile
                const firstProfile = createNewProfile("My First Project");
                appData.profiles.push(firstProfile);
                appData.activeProfileId = firstProfile.id;
            }
        }
        renderAll();
    }

    function saveState() {
        localStorage.setItem(DB_KEY, JSON.stringify(appData));
    }

    // --- IMPORT / EXPORT ---
    function handleExport() {
        const jsonString = JSON.stringify(appData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `umamusume_tracker_backup_${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.version || !data.profiles || !data.activeProfileId) {
                    throw new Error("Invalid backup file format.");
                }

                const confirmed = await Dialog.confirm("Are you sure? This will overwrite ALL your projects.", "Import Data");
                if (confirmed) {
                    appData = data;
                    saveState();
                    renderAll();
                }
            } catch (error) {
                await Dialog.alert(`Error importing file: ${error.message}`, "Import Error");
            } finally {
                event.target.value = null;
            }
        };
        reader.readAsText(file);
    }

    // --- SCORING LOGIC ---
    function getScore(category, type, stars) {
        const points = {
            blue: { primary: [0, 2, 6, 10], secondary: [0, 1, 4, 8], other: [0, 1, 2, 3] },
            pink: { primary: [0, 3, 6, 10], other: [0, 1, 2, 3] },
            white: { 'S': [0, 5, 10, 15], 'A': [0, 2, 5, 8], 'B': [0, 1, 3, 5], 'C': [0, 1, 2, 3] }
        };

        const goal = getActiveProfile().goal;

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
        const goal = getActiveProfile().goal;
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
        const profile = getActiveProfile();
        if (!profile) return;
        
        renderTabs();
        renderMultiSelects();
        renderWishlist();
        recalculateAllScores();
        renderRoster();
        renderTopParents();
        updateModalWishlist();
    }
    
    function renderTabs() {
        tabsList.innerHTML = '';
        appData.profiles.forEach(profile => {
            const li = document.createElement('li');
            li.className = `tab ${profile.id === appData.activeProfileId ? 'tab--active' : ''}`;
            li.innerHTML = `
                <button class="tab__button" data-id="${profile.id}">${profile.name}</button>
                <button class="tab__settings-btn" data-id="${profile.id}" title="Project Settings">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
            `;
            tabsList.appendChild(li);
        });
    }

    function recalculateAllScores() {
        const profile = getActiveProfile();
        if (!profile) return;
        profile.roster.forEach(parent => {
            parent.score = calculateScore(parent);
        });
    }

    function renderWishlist() {
        const goal = getActiveProfile().goal;
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
        const goal = getActiveProfile().goal;

        let blueSparkHTML = `<div class="spark-tag ${getSparkColor(parent.blueSpark.type)}">${parent.blueSpark.type} ${'★'.repeat(parent.blueSpark.stars)}</div>`;
        let pinkSparkHTML = `<div class="spark-tag ${getSparkColor(parent.pinkSpark.type)}">${parent.pinkSpark.type} ${'★'.repeat(parent.pinkSpark.stars)}</div>`;
        
        let whiteSparksHTML = parent.whiteSparks.map(spark => {
            const wishlistItem = goal.wishlist.find(w => w.name === spark.name);
            const tier = wishlistItem ? `Rank ${wishlistItem.tier}` : 'N/A';
            return `<div class="spark-tag bg-gray-200 text-gray-800">${spark.name} ${'★'.repeat(spark.stars)} <span class="parent-card__spark-tier">(${tier})</span></div>`;
        }).join('');

        const actionsHTML = !isTopParent ? `
            <div class="parent-card__actions">
                <button data-id="${parent.id}" class="parent-card__edit-btn">Edit</button>
                <button data-id="${parent.id}" class="parent-card__delete-btn">Delete</button>
            </div>
        ` : '';

        card.innerHTML = `
            <div class="parent-card__header">
                <div>
                    <h3 class="parent-card__name">${parent.name} <span class="parent-card__gen">(Gen ${parent.gen})</span></h3>
                </div>
                <div class="parent-card__score-wrapper">
                     <div class="parent-card__score">${parent.score} pts</div>
                     ${actionsHTML}
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
        const roster = getActiveProfile().roster;
        rosterContainer.innerHTML = '';
        if (roster.length === 0) {
            rosterContainer.innerHTML = `<p class="card__placeholder-text text-center py-8">Your roster is empty. Add a parent to get started!</p>`;
            return;
        }
        roster.sort((a, b) => b.score - a.score);
        roster.forEach(parent => renderParentCard(parent, rosterContainer));
    }
    
    function renderTopParents() {
        const roster = getActiveProfile().roster;
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
    
    function updateModalWishlist(skillToSelect = null) {
        const goal = getActiveProfile().goal;
        const sortedWishlist = [...goal.wishlist].sort((a, b) => a.name.localeCompare(b.name));
        modalWishlistSelect.innerHTML = sortedWishlist.map(w => `<option>${w.name}</option>`).join('');
        if (skillToSelect) {
            modalWishlistSelect.value = skillToSelect;
        }
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
        const goal = getActiveProfile().goal;
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
            const goal = getActiveProfile().goal;
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
            const goal = getActiveProfile().goal;
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

    // --- TABS LOGIC ---
    function createNewProfile(name) {
        return {
            id: Date.now(),
            name,
            goal: { primaryBlue: [], primaryPink: [], wishlist: [] },
            roster: []
        };
    }
    
    addProfileBtn.addEventListener('click', async () => {
        const name = await Dialog.prompt("Enter a name for the new project:", "New Project", "New Project");
        if (name) {
            const newProfile = createNewProfile(name);
            appData.profiles.push(newProfile);
            appData.activeProfileId = newProfile.id;
            saveState();
            renderAll();
        }
    });
    
    tabsList.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const profileId = parseInt(button.dataset.id);
        
        if(button.matches('.tab__button')) {
            appData.activeProfileId = profileId;
            saveState();
            renderAll();
        }
        
        if(button.matches('.tab__settings-btn')) {
            const profile = appData.profiles.find(p => p.id === profileId);
            const action = await Dialog.prompt(`Actions for "${profile.name}":\nType RENAME or DELETE`, 'Project Settings');
            
            if (action) {
                switch(action.toUpperCase()) {
                    case 'RENAME':
                        const newName = await Dialog.prompt("Enter new name:", "Rename Project", profile.name);
                        if (newName) {
                            profile.name = newName;
                            saveState();
                            renderTabs();
                        }
                        break;
                    case 'DELETE':
                        if (appData.profiles.length <= 1) {
                            await Dialog.alert("You cannot delete the last project.", "Action Prohibited");
                            return;
                        }
                        const confirmed = await Dialog.confirm(`Delete "${profile.name}"? This cannot be undone.`, "Confirm Deletion");
                        if (confirmed) {
                            appData.profiles = appData.profiles.filter(p => p.id !== profileId);
                            if (appData.activeProfileId === profileId) {
                                appData.activeProfileId = appData.profiles[0].id;
                            }
                            saveState();
                            renderAll();
                        }
                        break;
                    default:
                        await Dialog.alert(`"${action}" is not a valid action.`, "Invalid Action");
                }
            }
        }
    });

    // --- EVENT LISTENERS ---
    exportBtn.addEventListener('click', handleExport);
    importFile.addEventListener('change', handleImport);

    addWishlistBtn.addEventListener('click', () => {
        const name = wishlistNameInput.value.trim();
        const tier = wishlistTierSelect.value;
        const goal = getActiveProfile().goal;
        if (name && !goal.wishlist.some(w => w.name.toLowerCase() === name.toLowerCase())) {
            goal.wishlist.push({ name, tier });
            wishlistNameInput.value = '';
            saveState();
            renderAll();
        }
    });

    wishlistContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('wishlist__remove-btn')) {
            const name = e.target.dataset.name;
            const goal = getActiveProfile().goal;
            goal.wishlist = goal.wishlist.filter(item => item.name !== name);
            saveState();
            renderAll();
        }
    });

    rosterContainer.addEventListener('click', e => {
        if(e.target.classList.contains('parent-card__delete-btn')) {
            const id = parseInt(e.target.dataset.id);
            const roster = getActiveProfile().roster;
            getActiveProfile().roster = roster.filter(p => p.id !== id);
            saveState();
            renderAll();
        }
        if(e.target.classList.contains('parent-card__edit-btn')) {
            const id = parseInt(e.target.dataset.id);
            openEditModal(id);
        }
    });

    // --- MAIN MODAL LOGIC ---
    function openModal() {
        modal.classList.remove('hidden');
        setTimeout(()=> {
           modal.classList.remove('opacity-0');
           modal.querySelector('.modal__content').classList.remove('transform', '-translate-y-10');
        }, 10);
    }

    function closeModal() {
        editingParentId = null;
        modal.classList.add('opacity-0');
        modal.querySelector('.modal__content').classList.add('transform', '-translate-y-10');
        setTimeout(()=> {
           modal.classList.add('hidden');
           addParentForm.reset();
           currentWhiteSparks = [];
           modalWhiteSparksContainer.innerHTML = '';
        }, 250);
    };

    function openEditModal(parentId) {
        const roster = getActiveProfile().roster;
        const parent = roster.find(p => p.id === parentId);
        if (!parent) return;
        editingParentId = parentId;
        modalTitle.textContent = 'Edit Parent';
        saveParentBtn.textContent = 'Update Parent';
        genDisplay.classList.remove('hidden');
        genDisplayText.textContent = parent.gen;
        umaNameInput.value = parent.name;
        blueSparkTypeSelect.value = parent.blueSpark.type;
        blueSparkStarsSelect.value = parent.blueSpark.stars;
        pinkSparkTypeSelect.value = parent.pinkSpark.type;
        pinkSparkStarsSelect.value = parent.pinkSpark.stars;
        currentWhiteSparks = [...parent.whiteSparks];
        renderModalWhiteSparks();
        openModal();
    }

    addParentBtn.addEventListener('click', () => {
        editingParentId = null;
        modalTitle.textContent = 'Add New Parent';
        saveParentBtn.textContent = 'Calculate Score & Save';
        genDisplay.classList.add('hidden');
        addParentForm.reset();
        currentWhiteSparks = [];
        renderModalWhiteSparks();
        openModal();
    });
    
    closeModalBtn.addEventListener('click', closeModal);

    // --- OBTAINED WHITE SPARK LOGIC (IN MAIN MODAL) ---
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
            div.className = 'spark-tag bg-gray-200 text-gray-800 obtained-spark';
            div.innerHTML = `
                ${spark.name} ${'★'.repeat(spark.stars)}
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

    // --- SKILL MINI-MODAL LOGIC ---
    function openAddSkillModal() {
        addSkillModal.classList.remove('hidden');
        setTimeout(() => addSkillModal.classList.remove('opacity-0'), 10);
    }

    function closeAddSkillModal() {
        addSkillModal.classList.add('opacity-0');
        setTimeout(() => addSkillModal.classList.add('hidden'), 250);
        addSkillForm.reset();
    }

    showAddSkillModalBtn.addEventListener('click', openAddSkillModal);
    cancelAddSkillBtn.addEventListener('click', closeAddSkillModal);
    
    addSkillForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newSkillNameInput.value.trim();
        const tier = newSkillTierSelect.value;
        const goal = getActiveProfile().goal;
        if (name && !goal.wishlist.some(item => item.name.toLowerCase() === name.toLowerCase())) {
            goal.wishlist.push({ name, tier });
            saveState();
            renderWishlist();
            updateModalWishlist(name); // Update dropdown and select the new skill
            closeAddSkillModal();
        } else {
            await Dialog.alert("Skill name cannot be empty or already exist.");
        }
    });

    // --- WISHLIST MANAGEMENT MODAL LOGIC ---
    function openWishlistManagementModal() {
        renderWishlistManagementModal();
        wishlistManagementModal.classList.remove('hidden');
        setTimeout(() => wishlistManagementModal.classList.remove('opacity-0'), 10);
    }

    function closeWishlistManagementModal() {
        wishlistManagementModal.classList.add('opacity-0');
        setTimeout(() => wishlistManagementModal.classList.add('hidden'), 250);
    }

    function renderWishlistManagementModal() {
        const goal = getActiveProfile().goal;
        wishlistManagementList.innerHTML = '';
        if (goal.wishlist.length === 0) {
            wishlistManagementList.innerHTML = `<p class="card__placeholder-text text-center py-4">Wishlist is empty.</p>`;
            return;
        }

        const sortedWishlist = [...goal.wishlist].sort((a, b) => WISH_RANK_ORDER[a.tier] - WISH_RANK_ORDER[b.tier] || a.name.localeCompare(b.name));

        sortedWishlist.forEach(item => {
            const li = document.createElement('li');
            li.className = 'wishlist-manage__item';
            li.dataset.name = item.name;
            li.innerHTML = `
                <div class="wishlist-manage__item-info">
                    <span>${item.name}</span>
                    <span class="wishlist-manage__item-rank">Rank ${item.tier}</span>
                </div>
                <div class="wishlist-manage__item-actions">
                    <button class="parent-card__edit-btn wishlist-manage__edit-btn">Edit</button>
                    <button class="parent-card__delete-btn wishlist-manage__delete-btn">Delete</button>
                </div>
            `;
            wishlistManagementList.appendChild(li);
        });
    }

    manageWishlistBtn.addEventListener('click', openWishlistManagementModal);
    closeWishlistModalBtn.addEventListener('click', closeWishlistManagementModal);
    doneWishlistModalBtn.addEventListener('click', closeWishlistManagementModal);

    wishlistManagementList.addEventListener('click', async (e) => {
        const target = e.target;
        const li = target.closest('.wishlist-manage__item');
        if (!li && !target.closest('.wishlist-manage__edit-form')) return;
        
        const originalName = li ? li.dataset.name : target.closest('.wishlist-manage__edit-form').dataset.originalName;
        const goal = getActiveProfile().goal;

        if (target.matches('.wishlist-manage__delete-btn')) {
            const confirmed = await Dialog.confirm(`Are you sure you want to delete "${originalName}"?`, "Confirm Deletion");
            if (confirmed) {
                goal.wishlist = goal.wishlist.filter(item => item.name !== originalName);
                saveState();
                renderAll();
                renderWishlistManagementModal();
            }
        }

        if (target.matches('.wishlist-manage__edit-btn')) {
            const skill = goal.wishlist.find(s => s.name === originalName);
            const rankOptions = ['S', 'A', 'B', 'C'].map(r => `<option ${skill.tier === r ? 'selected' : ''}>${r}</option>`).join('');
            
            li.innerHTML = `
                <form class="wishlist-manage__edit-form" data-original-name="${originalName}">
                    <input type="text" class="form__input" value="${skill.name}" required>
                    <select class="form__input w-24">${rankOptions}</select>
                    <div class="wishlist-manage__item-actions">
                        <button type="submit" class="parent-card__edit-btn wishlist-manage__save-btn">Save</button>
                        <button type="button" class="parent-card__delete-btn wishlist-manage__cancel-btn">Cancel</button>
                    </div>
                </form>
            `;
            li.querySelector('input').focus();
        }

        if (target.matches('.wishlist-manage__cancel-btn')) {
            renderWishlistManagementModal();
        }
    });

    wishlistManagementList.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        if (!form.matches('.wishlist-manage__edit-form')) return;
        
        const originalName = form.dataset.originalName;
        const newName = form.querySelector('input').value.trim();
        const newTier = form.querySelector('select').value;
        const profile = getActiveProfile();
        
        if (!newName) {
            await Dialog.alert('Skill name cannot be empty.');
            return;
        }

        const isDuplicate = profile.goal.wishlist.some(item => item.name.toLowerCase() === newName.toLowerCase() && item.name !== originalName);
        if (isDuplicate) {
            await Dialog.alert('A skill with this name already exists.');
            return;
        }
        
        const skillToUpdate = profile.goal.wishlist.find(item => item.name === originalName);
        skillToUpdate.name = newName;
        skillToUpdate.tier = newTier;

        if (originalName !== newName) {
            profile.roster.forEach(parent => {
                parent.whiteSparks.forEach(spark => {
                    if (spark.name === originalName) {
                        spark.name = newName;
                    }
                });
            });
        }
        
        saveState();
        renderAll();
        renderWishlistManagementModal();
    });

    // --- MAIN FORM SUBMISSION ---
    addParentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const profile = getActiveProfile();
        const parentData = {
            name: umaNameInput.value,
            blueSpark: { type: blueSparkTypeSelect.value, stars: parseInt(blueSparkStarsSelect.value) },
            pinkSpark: { type: pinkSparkTypeSelect.value, stars: parseInt(pinkSparkStarsSelect.value) },
            whiteSparks: [...currentWhiteSparks],
        };

        if (editingParentId) {
            const parentToUpdate = profile.roster.find(p => p.id === editingParentId);
            if(parentToUpdate) {
                Object.assign(parentToUpdate, parentData);
                parentToUpdate.score = calculateScore(parentToUpdate);
            }
        } else {
            const newParent = { id: Date.now(), gen: getNextGenNumber(), ...parentData, score: 0 };
            newParent.score = calculateScore(newParent);
            profile.roster.push(newParent);
        }
        
        saveState();
        renderAll();
        closeModal();
    });

    // --- INITIAL LOAD ---
    loadState();
});