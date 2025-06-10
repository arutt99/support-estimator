document.addEventListener('DOMContentLoaded', () => {
    const teamNameInput = document.getElementById('team-name-input');
    const addTeamBtn = document.getElementById('add-team-btn');
    const teamSelect = document.getElementById('team-select');
    const deleteTeamBtn = document.getElementById('delete-team-btn');
    const estimatorForm = document.getElementById('estimator-form');
    const estimatorTbody = document.getElementById('estimator-tbody');
    const miscHoursInput = document.getElementById('misc-hours-input');
    const totalHoursDisplay = document.getElementById('total-hours-display');
    const viewSummaryBtn = document.getElementById('view-summary-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    // Custom phase hour inputs
    const discoveryHoursInput = document.getElementById('discovery-hours-input');
    const releaseHoursInput = document.getElementById('release-hours-input');
    const warrantyHoursInput = document.getElementById('warranty-hours-input');
    const customPhaseInputs = {
        'discovery': discoveryHoursInput,
        'production-release': releaseHoursInput,
        'warranty': warrantyHoursInput
    };


    const LOCAL_STORAGE_KEY = 'estimatorTeamsData';
    const LAST_SELECTED_TEAM_KEY = 'lastSelectedTeam';

    let teamsData = {}; // { teamName: { selections: {}, customPhaseHours: {}, miscHours: 0, totalHours: 0 } }
    let currentTeam = null;

    // --- Load Data from localStorage on Page Load ---
    function loadTeams() {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedData) {
            try {
                teamsData = JSON.parse(storedData);
                if (typeof teamsData !== 'object' || teamsData === null) {
                    teamsData = {};
                }
                // Ensure all teams have customPhaseHours initialized
                Object.values(teamsData).forEach(team => {
                    if (!team.customPhaseHours) {
                        team.customPhaseHours = { 'discovery': 0, 'production-release': 0, 'warranty': 0 };
                    }
                });
            } catch (e) {
                console.error("Error parsing localStorage data:", e);
                teamsData = {};
            }
        }
        populateTeamSelector();
        const lastTeam = localStorage.getItem(LAST_SELECTED_TEAM_KEY);
        if (lastTeam && teamsData[lastTeam]) {
            teamSelect.value = lastTeam;
            selectTeam(lastTeam);
        } else if (Object.keys(teamsData).length > 0) {
            const firstTeam = Object.keys(teamsData)[0];
            teamSelect.value = firstTeam;
            selectTeam(firstTeam);
        } else {
            resetFormToDefaults(); // Clear form if no teams
            calculateTotalHours(); // Calculate initial hours (should be 0 or defaults)
        }
    }

    // --- Populate Team Selector Dropdown ---
    function populateTeamSelector() {
        const existingTeams = Object.keys(teamsData);
        teamSelect.innerHTML = '<option value="">-- Select a Team --</option>';
        existingTeams.forEach(teamName => {
            const option = document.createElement('option');
            option.value = teamName;
            option.textContent = teamName;
            teamSelect.appendChild(option);
        });
    }

    // --- Add New Team ---
    addTeamBtn.addEventListener('click', () => {
        const teamName = teamNameInput.value.trim();
        if (teamName && !teamsData[teamName]) {
            teamsData[teamName] = {
                selections: {},
                customPhaseHours: {
                    'discovery': parseInt(discoveryHoursInput.value, 10) || 0, // Or just 0
                    'production-release': parseInt(releaseHoursInput.value, 10) || 0,
                    'warranty': parseInt(warrantyHoursInput.value, 10) || 0
                },
                miscHours: 0,
                totalHours: 0
            };
            currentTeam = teamName;
            populateTeamSelector();
            teamSelect.value = teamName;
            resetFormForNewTeam(); // Reset inputs but keep custom hours if they were just set for the "template"
            loadTeamData(teamName); // Load the newly created (and potentially pre-filled) data
            calculateTotalHours();
            saveData();
            teamNameInput.value = '';
            localStorage.setItem(LAST_SELECTED_TEAM_KEY, currentTeam);
        } else if (teamsData[teamName]) {
            alert('Team name already exists. Please choose a different name.');
        } else {
            alert('Please enter a valid team name.');
        }
    });

    // --- Delete Selected Team ---
    deleteTeamBtn.addEventListener('click', () => {
        const teamToDelete = teamSelect.value;
        if (!teamToDelete) {
            alert("Please select a team to delete.");
            return;
        }

        if (confirm(`Are you sure you want to delete the team "${teamToDelete}"? This action cannot be undone.`)) {
            delete teamsData[teamToDelete];
            if (currentTeam === teamToDelete) {
                currentTeam = null;
                localStorage.removeItem(LAST_SELECTED_TEAM_KEY);
                resetFormToDefaults();
            }
            populateTeamSelector();
            teamSelect.value = ""; // Reset to default "Select a Team"
            calculateTotalHours();
            saveData();
        }
    });

    // --- Select Team ---
    teamSelect.addEventListener('change', () => {
        const selectedTeamName = teamSelect.value;
        selectTeam(selectedTeamName);
    });

    function selectTeam(teamName) {
        if (teamName && teamsData[teamName]) {
            currentTeam = teamName;
            loadTeamData(teamName);
            localStorage.setItem(LAST_SELECTED_TEAM_KEY, currentTeam);
        } else {
            currentTeam = null;
            resetFormToDefaults();
            localStorage.removeItem(LAST_SELECTED_TEAM_KEY);
        }
        calculateTotalHours();
    }

    // --- Load Data for Selected Team ---
    function loadTeamData(teamName) {
        if (!teamsData[teamName]) return;
        const teamData = teamsData[teamName];

        clearSelectionsVisually();

        // Load selections for complex phases
        for (const phaseKey in teamData.selections) {
            const value = teamData.selections[phaseKey];
            const row = estimatorTbody.querySelector(`tr[data-phase-key="${phaseKey}"]`);
            if (row) {
                const cell = row.querySelector(`td.selectable-cell[data-value="${value}"]`);
                if (cell) cell.classList.add('selected');
            }
        }

        // Load custom phase hours
        for (const phaseKey in teamData.customPhaseHours) {
            if (customPhaseInputs[phaseKey]) {
                customPhaseInputs[phaseKey].value = teamData.customPhaseHours[phaseKey] || 0;
            }
        }

        miscHoursInput.value = teamData.miscHours || 0;
        // Total hours will be recalculated by calculateTotalHours()
    }

    // --- Clear Visual Selections in Table ---
    function clearSelectionsVisually() {
        estimatorTbody.querySelectorAll('.selectable-cell.selected')
            .forEach(cell => cell.classList.remove('selected'));
    }

    // --- Reset form to default state (e.g., when no team is selected or all data cleared) ---
    function resetFormToDefaults() {
        clearSelectionsVisually();
        discoveryHoursInput.value = 0;
        releaseHoursInput.value = 0;
        warrantyHoursInput.value = 0;
        miscHoursInput.value = 0;
        teamNameInput.value = '';
        // totalHoursDisplay will be updated by calculateTotalHours
    }

    // --- Reset form for a new team (keeps custom hours if they were set before naming team) ---
    function resetFormForNewTeam() {
        clearSelectionsVisually();
        // Custom phase inputs are handled by addTeamBtn based on current values
        miscHoursInput.value = 0;
    }


    // --- Calculate Total Hours ---
    function calculateTotalHours() {
        let total = 0;

        // Add hours from custom phase inputs
        Object.values(customPhaseInputs).forEach(input => {
            total += parseInt(input.value, 10) || 0;
        });

        // Add hours from selected cells for complex phases
        estimatorTbody.querySelectorAll('.selectable-cell.selected').forEach(cell => {
            const row = cell.closest('tr');
            if (row && row.hasAttribute('data-hours')) {
                const hoursData = JSON.parse(row.getAttribute('data-hours'));
                const selectedValue = cell.getAttribute('data-value');
                if (hoursData && hoursData[selectedValue] !== undefined) {
                    total += hoursData[selectedValue];
                }
            }
        });

        total += parseInt(miscHoursInput.value, 10) || 0;
        totalHoursDisplay.textContent = total;

        if (currentTeam && teamsData[currentTeam]) {
            teamsData[currentTeam].totalHours = total;
        }
        return total;
    }

    // --- Event Listener for Cell Clicks (Complex Phases) ---
    estimatorTbody.addEventListener('click', (event) => {
        const clickedCell = event.target.closest('.selectable-cell');
        if (!clickedCell) return;

        if (!currentTeam) {
            alert("Please add or select a team before making selections.");
            return;
        }

        const row = clickedCell.closest('tr');
        const phaseKey = row.getAttribute('data-phase-key');
        const value = clickedCell.getAttribute('data-value');

        if (!phaseKey) return;

        teamsData[currentTeam].selections[phaseKey] = value;

        row.querySelectorAll('.selectable-cell').forEach(cell => cell.classList.remove('selected'));
        clickedCell.classList.add('selected');

        calculateTotalHours();
        saveData();
    });

    // --- Event Listeners for Custom Phase Hour Inputs ---
    Object.entries(customPhaseInputs).forEach(([phaseKey, inputElement]) => {
        inputElement.addEventListener('input', () => {
            if (!currentTeam) {
                // Allow changing defaults even if no team, but won't save until team selected/created
                calculateTotalHours(); // Recalculate display
                return;
            }
            teamsData[currentTeam].customPhaseHours[phaseKey] = parseInt(inputElement.value, 10) || 0;
            calculateTotalHours();
            saveData();
        });
    });


    // --- Event Listener for Misc Hours Change ---
    miscHoursInput.addEventListener('input', () => {
        if (!currentTeam) {
            // Allow changing if no team, but won't save until team selected/created
             calculateTotalHours(); // Recalculate display
            return;
        }
        teamsData[currentTeam].miscHours = parseInt(miscHoursInput.value, 10) || 0;
        calculateTotalHours();
        saveData();
    });

    // --- Save All Data to localStorage ---
    function saveData() {
        if (currentTeam && teamsData[currentTeam]) {
             // Ensure current team's total hours are up-to-date before saving
            teamsData[currentTeam].totalHours = calculateTotalHours();
        }
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(teamsData));
        } catch (e) {
            console.error("Error saving data to localStorage:", e);
            alert("There was an error saving your changes. Please try again.");
        }
    }

    // --- View Summary ---
    viewSummaryBtn.addEventListener('click', () => {
        saveData(); // Ensure latest data is saved
        if (Object.keys(teamsData).length === 0) {
            alert("No team data entered yet. Please add a team and make selections.");
            return;
        }
        window.location.href = 'summary.html';
    });

    // --- Clear All Data Button ---
    clearAllBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete ALL teams and ALL data? This action cannot be undone.")) {
            teamsData = {};
            currentTeam = null;
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.removeItem(LAST_SELECTED_TEAM_KEY);
            populateTeamSelector();
            teamSelect.value = "";
            resetFormToDefaults();
            calculateTotalHours(); // Should set display to 0
            // No need to call saveData() as we just cleared everything.
        }
    });

    // --- Initial Load ---
    loadTeams();
});