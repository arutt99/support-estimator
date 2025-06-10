document.addEventListener('DOMContentLoaded', () => {
    const summaryBody = document.getElementById('summary-body');
    const backBtn = document.getElementById('back-to-estimator-btn');
    const grandTotalHoursEl = document.getElementById('grand-total-hours');
    const grandTotalCostEl = document.getElementById('grand-total-cost');

    const LOCAL_STORAGE_KEY = 'estimatorTeamsData';
    const HOURLY_RATE = 250;

    const phaseDisplayNames = {
        "discovery": "Initiation & Discovery",
        "incident-management": "Incident Mgmt",
        "service-management": "Service Mgmt",
        "problem-management": "Problem Mgmt",
        "change-management": "Change Mgmt",
        "knowledge-management": "Knowledge Mgmt",
        "cmdb-asset-management": "CMDB/Asset Mgmt",
        "data-migration": "Data Migration",
        "training": "Training",
        "production-release": "Production Release",
        "warranty": "Warranty",
    };

    const scoreDisplayMapping = {
        "na": "N/A",
        "cs1": "Complexity 1",
        "cs2": "Complexity 2",
        "cs3": "Complexity 3",
    };

    function updateGrandTotals(hours, cost) {
        grandTotalHoursEl.textContent = hours;
        grandTotalCostEl.textContent = formatCurrency(cost);
    }

    function loadAndDisplaySummary() {
        summaryBody.innerHTML = '';
        let grandTotalHours = 0;
        let grandTotalCost = 0;

        const storedDataString = localStorage.getItem(LOCAL_STORAGE_KEY);

        if (!storedDataString) {
            displayMessage("No estimation data found. Go back to the estimator to add teams.");
            updateGrandTotals(0, 0);
            return;
        }

        let teamsData;
        try {
            teamsData = JSON.parse(storedDataString);
            if (typeof teamsData !== 'object' || teamsData === null) throw new Error("Parsed data is not a valid object.");
        } catch (error) {
            console.error("summary.js: Error parsing localStorage data:", error);
            displayMessage("Error loading estimation data. Data might be corrupted.");
            updateGrandTotals(0, 0);
            return;
        }

        const teamNames = Object.keys(teamsData);
        if (teamNames.length === 0) {
            displayMessage("No teams found in the estimation data.");
            updateGrandTotals(0, 0);
            return;
        }

        teamNames.forEach(teamName => {
            const team = teamsData[teamName];
            if (!team || typeof team.selections !== 'object' || typeof team.customPhaseHours !== 'object' || team.selections === null || team.customPhaseHours === null) {
                console.warn(`summary.js: Skipping team "${teamName}" due to invalid data structure:`, team);
                return;
            }

            const row = document.createElement('tr');

            const nameCell = document.createElement('td');
            nameCell.textContent = teamName;
            row.appendChild(nameCell);

            const detailsCell = document.createElement('td');
            const detailsHTML = generateDetailsList(team);
            detailsCell.innerHTML = `<div class="summary-details">${detailsHTML}</div>`;
            row.appendChild(detailsCell);

            const hoursCell = document.createElement('td');
            const totalHours = team.totalHours || 0;
            hoursCell.textContent = totalHours;
            grandTotalHours += totalHours;
            row.appendChild(hoursCell);

            const costCell = document.createElement('td');
            const totalCost = totalHours * HOURLY_RATE;
            costCell.textContent = formatCurrency(totalCost);
            grandTotalCost += totalCost;
            row.appendChild(costCell);

            summaryBody.appendChild(row);
        });

        updateGrandTotals(grandTotalHours, grandTotalCost);
    }

    function generateDetailsList(teamData) {
        const details = [];

        // Add custom phase hours first, if they exist and are > 0
        if (teamData.customPhaseHours) {
            for (const phaseKey in teamData.customPhaseHours) {
                const hours = teamData.customPhaseHours[phaseKey];
                if (hours > 0) {
                    const phaseName = phaseDisplayNames[phaseKey] || phaseKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    details.push(`${phaseName}: ${hours} hrs`);
                }
            }
        }

        // Add selections for complex phases
        for (const phaseKey in teamData.selections) {
            const selectedValue = teamData.selections[phaseKey];
            const phaseName = phaseDisplayNames[phaseKey] || phaseKey;
            const scoreDisplay = scoreDisplayMapping[selectedValue] || selectedValue;
            // Only add if not N/A, or if you want to explicitly show N/A
            if (selectedValue !== "na") {
                 details.push(`${phaseName}: ${scoreDisplay}`);
            }
        }

        if (teamData.miscHours && teamData.miscHours > 0) {
            details.push(`Misc Hours: ${teamData.miscHours}`);
        }

        if (details.length === 0) return '--';
        return `<ul>${details.map(item => `<li>${item}</li>`).join('')}</ul>`;
    }

    function displayMessage(message) {
        summaryBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">${message}</td></tr>`;
    }

    function formatCurrency(amount) {
        // Use toLocaleString for currency formatting with commas
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2, // Ensure two decimal places
            maximumFractionDigits: 2
        });
    }

    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    loadAndDisplaySummary();
});