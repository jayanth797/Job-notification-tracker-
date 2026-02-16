document.addEventListener('DOMContentLoaded', () => {
    // State
    let savedJobIds = JSON.parse(localStorage.getItem('savedJobs')) || [];
    let preferences = JSON.parse(localStorage.getItem('jobTrackerPreferences')) || {};
    let showMatchesOnly = false;

    // DOM Elements - Global
    const modal = document.getElementById('job-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalContent = document.querySelector('.modal-body');

    // DOM Elements - Dashboard
    const jobContainer = document.getElementById('job-container');
    const searchInput = document.getElementById('search-filter');
    const locationSelect = document.getElementById('location-filter');
    const modeSelect = document.getElementById('mode-filter');
    const experienceSelect = document.getElementById('experience-filter');
    const sourceSelect = document.getElementById('source-filter');
    const sortSelect = document.getElementById('sort-filter');
    const matchToggle = document.getElementById('match-toggle-checkbox'); // New Toggle

    // DOM Elements - Settings
    const settingsForm = document.getElementById('preferences-form');
    const roleInput = document.getElementById('role-keywords');
    const skillsInput = document.getElementById('skills');
    const locInput = document.getElementById('locations');
    const expInput = document.getElementById('experience');
    const scoreSlider = document.getElementById('min-score');
    const scoreDisplay = document.getElementById('score-display');
    const toast = document.getElementById('toast');


    // --- MATCH SCORE ENGINE ---
    const calculateMatchScore = (job) => {
        if (!preferences.roleKeywords) return 0; // No score if no prefs

        let score = 0;
        const jobTitle = job.title.toLowerCase();
        const jobDesc = job.description.toLowerCase();

        // 1. Role Keyword Matches (+25 Title, +15 Desc)
        const keywords = preferences.roleKeywords.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
        let titleMatch = false;
        let descMatch = false;

        keywords.forEach(kw => {
            if (jobTitle.includes(kw)) titleMatch = true;
            if (jobDesc.includes(kw)) descMatch = true;
        });

        if (titleMatch) score += 25;
        if (descMatch) score += 15;

        // 2. Location Match (+15)
        if (preferences.locations && preferences.locations.includes(job.location)) {
            score += 15;
        }

        // 3. Mode Match (+10)
        if (preferences.modes && preferences.modes.includes(job.mode)) {
            score += 10;
        }

        // 4. Experience Match (+10)
        // Simple string match for MVP (Fresher === Fresher)
        // Ideally should support range overlap logic
        if (preferences.experience && job.experience === preferences.experience) {
            score += 10;
        }

        // 5. Skills Match (+15, any overlap)
        if (preferences.skills) {
            const userSkills = preferences.skills.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
            const jobSkills = job.skills.map(s => s.toLowerCase());
            const hasSkillMatch = userSkills.some(us => jobSkills.includes(us));
            if (hasSkillMatch) score += 15;
        }

        // 6. Freshness Bonus (+5)
        if (job.postedDaysAgo <= 2) {
            score += 5;
        }

        // 7. Source Bonus (+5)
        if (job.source === 'LinkedIn') {
            score += 5;
        }

        return Math.min(score, 100); // Cap at 100
    };

    const getMatchBadgeColor = (score) => {
        if (score >= 80) return '#4A6E48'; // Green
        if (score >= 60) return '#B48E3C'; // Amber
        if (score >= 40) return '#666';    // Grey
        return '#ccc'; // Light Grey
    };


    // --- RENDERING ---

    const formatDaysAgo = (days) => {
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    const createJobCard = (job) => {
        const isSaved = savedJobIds.includes(job.id);
        const score = calculateMatchScore(job);
        const badgeColor = getMatchBadgeColor(score);
        const showBadge = score > 0;

        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-card-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <p class="job-company">${job.company}</p>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    <span class="job-source-badge ${job.source.toLowerCase()}">${job.source}</span>
                    ${showBadge ? `<span class="score-badge" style="background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${score}% Match</span>` : ''}
                </div>
            </div>
            
            <div class="job-details">
                <div class="detail-item">
                    <span class="icon">📍</span> ${job.location} (${job.mode})
                </div>
                <div class="detail-item">
                    <span class="icon">💼</span> ${job.experience}
                </div>
                <div class="detail-item">
                    <span class="icon">💰</span> ${job.salaryRange}
                </div>
            </div>

            <div class="job-meta">
                <span class="posted-date">Posted ${formatDaysAgo(job.postedDaysAgo)}</span>
            </div>

            <div class="job-actions">
                <button class="btn btn-secondary btn-sm" onclick="app.viewJob(${job.id})">View</button>
                <button class="btn btn-secondary btn-sm ${isSaved ? 'saved-active' : ''}" onclick="app.toggleSave(${job.id})">
                    ${isSaved ? 'Saved' : 'Save'}
                </button>
                <button class="btn btn-primary btn-sm" onclick="window.open('${job.applyUrl}', '_blank')">Apply</button>
            </div>
        `;
        return card;
    };

    const renderJobs = (jobs) => {
        if (!jobContainer) return;
        jobContainer.innerHTML = '';

        if (jobs.length === 0) {
            jobContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No jobs found matching your criteria.</h3>
                    <p>Try adjusting your filters or lowering your match threshold.</p>
                </div>
            `;
            return;
        }

        jobs.forEach(job => {
            jobContainer.appendChild(createJobCard(job));
        });
    };

    // --- LOGIC ---

    const filterAndSortJobs = () => {
        if (!searchInput) return JOBS_DATA; // Return all if not on dashboard

        const searchTerm = searchInput.value.toLowerCase();
        const locationValue = locationSelect.value;
        const modeValue = modeSelect.value;
        const experienceValue = experienceSelect.value;
        const sourceValue = sourceSelect.value; // Corrected ID reference
        const sortValue = sortSelect.value;

        const minScore = parseInt(preferences.minScore || 0);

        // Filter
        let filtered = JOBS_DATA.filter(job => {
            const matchesSearch = job.title.toLowerCase().includes(searchTerm) ||
                job.company.toLowerCase().includes(searchTerm);
            const matchesLocation = locationValue === '' || job.location.includes(locationValue);
            const matchesMode = modeValue === '' || job.mode === modeValue;
            const matchesExperience = experienceValue === '' || job.experience === experienceValue;
            const matchesSource = sourceValue === '' || job.source === sourceValue;

            // Match Filter
            const score = calculateMatchScore(job);
            const matchesScore = !showMatchesOnly || (score >= minScore);

            return matchesSearch && matchesLocation && matchesMode && matchesExperience && matchesSource && matchesScore;
        });

        // Sort
        if (sortValue === 'latest') {
            filtered.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
        } else if (sortValue === 'match_score') {
            filtered.sort((a, b) => calculateMatchScore(b) - calculateMatchScore(a));
        } else if (sortValue === 'salary') {
            filtered.sort((a, b) => b.salaryRange.length - a.salaryRange.length);
        }

        return filtered;
    };


    // --- INITIALIZATION ---

    const init = () => {
        // SETTINGS PAGE LOGIC
        if (settingsForm) {
            // Prefill Form
            if (preferences.roleKeywords) roleInput.value = preferences.roleKeywords;
            if (preferences.skills) skillsInput.value = preferences.skills;
            if (preferences.experience) expInput.value = preferences.experience;

            if (preferences.locations) {
                Array.from(locInput.options).forEach(opt => {
                    if (preferences.locations.includes(opt.value)) opt.selected = true;
                });
            }

            if (preferences.modes) {
                const checkboxes = document.querySelectorAll('input[name="mode"]');
                checkboxes.forEach(cb => {
                    if (preferences.modes.includes(cb.value)) cb.checked = true;
                });
            }

            if (preferences.minScore) {
                scoreSlider.value = preferences.minScore;
                scoreDisplay.innerText = preferences.minScore;
            }

            // Slider Event
            scoreSlider.addEventListener('input', (e) => {
                scoreDisplay.innerText = e.target.value;
            });

            // Save
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const selectedLocations = Array.from(locInput.selectedOptions).map(opt => opt.value);
                const selectedModes = Array.from(document.querySelectorAll('input[name="mode"]:checked')).map(cb => cb.value);

                preferences = {
                    roleKeywords: roleInput.value,
                    skills: skillsInput.value,
                    experience: expInput.value,
                    locations: selectedLocations,
                    modes: selectedModes,
                    minScore: parseInt(scoreSlider.value)
                };

                localStorage.setItem('jobTrackerPreferences', JSON.stringify(preferences));

                toast.style.display = 'block';
                setTimeout(() => toast.style.display = 'none', 3000);
            });
        }

        // SAVED PAGE LOGIC
        const isSavedPage = window.location.pathname.includes('saved.html');
        if (isSavedPage) {
            const savedJobs = JOBS_DATA.filter(job => savedJobIds.includes(job.id));
            if (savedJobs.length === 0) {
                jobContainer.innerHTML = `
                    <div class="empty-state">
                        <h2>Your Shortlist is Empty</h2>
                        <p style="color: #666;">Bookmark high-potential opportunities here for deeper review.</p>
                        <a href="dashboard.html" class="btn btn-primary" style="margin-top: 16px;">Browse Jobs</a>
                    </div>
                `;
            } else {
                renderJobs(savedJobs);
            }
        }
        // DASHBOARD LOGIC
        else if (jobContainer) {
            // Check for unset prefs
            if (!preferences.roleKeywords) {
                const banner = document.createElement('div');
                banner.style.cssText = `
                    background: #fff3cd;
                    border: 1px solid #ffeeba;
                    color: #856404;
                    padding: 12px 20px;
                    margin-bottom: 24px;
                    border-radius: 4px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;
                banner.innerHTML = `
                    <span><strong>Action Required:</strong> Set your preferences to activate intelligent matching.</span>
                    <a href="settings.html" class="btn btn-sm" style="background: #856404; color: white; border: none;">Set Preferences</a>
                `;
                jobContainer.parentElement.insertBefore(banner, jobContainer);
            }

            // Initial Render
            const filtered = filterAndSortJobs();
            renderJobs(filtered);

            // Listeners
            if (searchInput) {
                const inputs = [searchInput, locationSelect, modeSelect, experienceSelect, sourceSelect, sortSelect];
                inputs.forEach(el => el.addEventListener('input', () => renderJobs(filterAndSortJobs())));

                // Toggle Switch Logic
                if (matchToggle) {
                    matchToggle.addEventListener('change', (e) => {
                        showMatchesOnly = e.target.checked;
                        renderJobs(filterAndSortJobs());
                    });
                }
            }
        }
    };

    // --- GLOBAL API ---
    window.app = {
        toggleSave: (id) => {
            const index = savedJobIds.indexOf(id);
            if (index === -1) {
                savedJobIds.push(id);
            } else {
                savedJobIds.splice(index, 1);
            }
            localStorage.setItem('savedJobs', JSON.stringify(savedJobIds));
            init();
        },
        viewJob: (id) => {
            const job = JOBS_DATA.find(j => j.id === id);
            if (!job) return;

            const score = calculateMatchScore(job); // Calc score for modal too

            modalContent.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h2>${job.title}</h2>
                    ${score > 0 ? `<span style="background: ${getMatchBadgeColor(score)}; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${score}% Match</span>` : ''}
                </div>
                <h3 style="color: #666; margin-bottom: 24px;">${job.company}</h3>
                
                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
                    <span class="badge">${job.location}</span>
                    <span class="badge">${job.mode}</span>
                    <span class="badge">${job.salaryRange}</span>
                    <span class="badge">${job.source}</span>
                </div>

                <h4>Description</h4>
                <p style="margin-bottom: 24px; white-space: pre-line;">${job.description}</p>

                <h4>Skills</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${job.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
                </div>

                <div style="margin-top: 32px; text-align: right;">
                     <button class="btn btn-primary" onclick="window.open('${job.applyUrl}', '_blank')">Apply Now</button>
                </div>
            `;
            modal.style.display = 'flex';
        }
    };

    // Close Modal
    if (closeModal) {
        closeModal.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Start
    init();
});
