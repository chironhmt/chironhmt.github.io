// Global Data State
let agentsData = [];
let dosingDaysMap = {};
let regimensData = [];
let groupedAgents = {};

// Application State
let cycles = [];
let currentCycleId = null;

// DOM Elements
const cycleListEl = document.getElementById('cycle-list');
const addCycleBtn = document.getElementById('add-cycle-btn');
const emptyStateEl = document.getElementById('empty-state');
const cyclePlannerEl = document.getElementById('cycle-planner');
const currentCycleTitleEl = document.getElementById('current-cycle-title');
const deleteCycleBtn = document.getElementById('delete-cycle-btn');
const agentClassesContainer = document.getElementById('agent-classes-container');
const agentConfigsContainer = document.getElementById('agent-configs-container');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

async function loadData() {
    try {
        const [agentsRes, daysRes, regimensRes] = await Promise.all([
            fetch('../HemaCDS2.0_Mutiple Myeloma_Agents.json?v=' + Date.now()),
            fetch('../HemaCDS2.0_Mutiple Myeloma_Dosing_days.json?v=' + Date.now()),
            fetch('../HemaCDS2.0_Mutiple Myeloma_Regimens.json?v=' + Date.now())
        ]);

        if (!agentsRes.ok || !daysRes.ok || !regimensRes.ok) {
            throw new Error('Failed to fetch JSON files. Ensure you are running via a local web server (e.g., 실행하기.bat).');
        }

        agentsData = await agentsRes.json();
        const dosingDaysData = await daysRes.json();
        regimensData = await regimensRes.json();

        // Ensure "Others" is in agentsData if not present
        if (!agentsData.find(a => a.Agent === 'Others')) {
            agentsData.push({
                "Class": "Others",
                "Agent": "Others",
                "Abbreviations": "",
                "Dose": "",
                "Dosing_day": ""
            });
        }

        // Build groupedAgents
        groupedAgents = {};
        agentsData.forEach(agent => {
            if (!groupedAgents[agent.Class]) {
                groupedAgents[agent.Class] = [];
            }
            groupedAgents[agent.Class].push(agent);
        });

        // Build dosingDaysMap
        dosingDaysMap = {};
        dosingDaysData.forEach(d => {
            dosingDaysMap[d.Code] = d.Dosing_days;
        });

        loadingOverlay.classList.add('hidden');
        init();

    } catch (err) {
        console.error(err);
        loadingText.textContent = 'Failed to load data. Do not open index.html directly in a web browser. Please run the local server by double-clicking the provided .bat file (e.g., HemaCDS2.0_Mutiple Myeloma_Chemotherapy.bat).';
        loadingText.style.color = '#ef4444'; // danger color
        const spinner = document.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';
    }
}

// Initialization
function init() {
    renderSidebar();
    renderAgentCheckboxes();
    updateMainContent();
    
    // Populate Regimen Dropdown
    const regimenSelect = document.getElementById('regimen-input');
    if (regimenSelect && typeof regimensData !== 'undefined') {
        regimensData.forEach(r => {
            const option = document.createElement('option');
            option.value = r.Regimen;
            option.textContent = r.Regimen;
            regimenSelect.insertBefore(option, regimenSelect.querySelector('option[value="Others"]'));
        });
    }

    setupEventListeners();
    addCycle();

    // Default to 'Choose regimen'
    if (regimenSelect) {
        regimenSelect.value = "";
    }
}

function setupEventListeners() {
    addCycleBtn.addEventListener('click', addCycle);
    const cycleInput = document.getElementById('new-cycle-input');
    if (cycleInput) {
        cycleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addCycle();
        });
    }
    deleteCycleBtn.addEventListener('click', deleteCurrentCycle);
    
    const startDateInput = document.getElementById('cycle-start-date');
    const lengthInput = document.getElementById('cycle-length');
    if (startDateInput) {
        startDateInput.addEventListener('change', (e) => {
            if (currentCycleId) {
                const cycle = getCycle(currentCycleId);
                cycle.startDate = e.target.value;
                renderSidebar();
                renderSummary();
            }
        });
    }
    if (lengthInput) {
        lengthInput.addEventListener('input', (e) => {
            if (currentCycleId) {
                const cycle = getCycle(currentCycleId);
                cycle.lengthDays = e.target.value;
                renderSidebar();
                renderSummary();
            }
        });
    }
    
    const regimenSelect = document.getElementById('regimen-input');
    const customRegimenInput = document.getElementById('custom-regimen-input');
    
    if (regimenSelect) {
        regimenSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'Others') {
                if (customRegimenInput) {
                    customRegimenInput.classList.remove('hidden');
                    customRegimenInput.focus();
                }
            } else {
                if (customRegimenInput) {
                    customRegimenInput.classList.add('hidden');
                }
                if (typeof regimensData !== 'undefined') {
                    const regimenObj = regimensData.find(r => r.Regimen === val);
                    if (regimenObj) {
                        if (confirm(`Apply preset "${val}"? This will clear current cycles and create new ones.`)) {
                            applyRegimen(regimenObj);
                        }
                    }
                }
            }
            renderSummary();
            updateTitleDynamically();
        });
    }

    function updateTitleDynamically() {
        if (currentCycleId) {
            const cycle = getCycle(currentCycleId);
            const lineSelect = document.getElementById('line-input');
            let lineVal = '';
            if (lineSelect) {
                lineVal = ['Consolidation', 'Maintenance'].includes(lineSelect.value) ? lineSelect.value : `${lineSelect.value} Line`;
            }
            
            const regimenSelect = document.getElementById('regimen-input');
            let regimenVal = regimenSelect ? regimenSelect.value : '';
            if (regimenVal === 'Others') {
                const customRegimenInput = document.getElementById('custom-regimen-input');
                regimenVal = customRegimenInput ? customRegimenInput.value : '';
            }

            const currentCycleTitleEl = document.getElementById('current-cycle-title');
            if (currentCycleTitleEl) {
                currentCycleTitleEl.textContent = regimenVal ? `${lineVal} ${regimenVal} ${cycle.name}`.trim() : `${lineVal} ${cycle.name}`.trim();
            }
        }
    }

    const lineSelect = document.getElementById('line-input');
    if (lineSelect) {
        lineSelect.addEventListener('change', () => {
            renderSummary();
            updateTitleDynamically();
        });
    }

    if (customRegimenInput) {
        customRegimenInput.addEventListener('input', () => {
            renderSummary();
            updateTitleDynamically();
        });
    }
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function parseCycleRange(cycleStr) {
    if (!cycleStr) return [];
    cycleStr = cycleStr.toString().trim();
    const result = new Set();
    let hasValidNumber = false;
    
    // Split by comma first
    const parts = cycleStr.split(',');
    parts.forEach(part => {
        part = part.trim();
        if (part.includes('-')) {
            const rangeParts = part.split('-');
            const start = parseInt(rangeParts[0], 10);
            const end = parseInt(rangeParts[1], 10);
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    result.add(i);
                }
                hasValidNumber = true;
            }
        } else {
            const val = parseInt(part, 10);
            if (!isNaN(val)) {
                result.add(val);
                hasValidNumber = true;
            }
        }
    });
    
    return hasValidNumber ? Array.from(result).sort((a, b) => a - b) : [];
}

function applyRegimen(regimenObj) {
    // Clear existing cycles
    cycles = [];
    currentCycleId = null;

    if (!regimenObj.Cycles || regimenObj.Cycles.length === 0) {
        addCycle();
        return;
    }

    regimenObj.Cycles.forEach(config => {
        let lengthDays = '28';
        let agentsConfig = [];
        
        if (config.Length) lengthDays = config.Length.toString();
        if (config.Agents) agentsConfig = config.Agents;
        
        const parsedCycles = parseCycleRange(config.Cycle);
        const cycleNames = parsedCycles.length > 0 ? parsedCycles.map(n => `Cycle ${n}`) : [config.Cycle ? `Cycle ${config.Cycle}` : `Cycle ${cycles.length + 1}`];

        cycleNames.forEach(cycleName => {
            const newCycle = {
                id: generateId(),
                name: cycleName,
                startDate: '', 
                lengthDays: lengthDays,
                selectedAgents: {}
            };
            
            agentsConfig.forEach(agentReq => {
                const drugName = agentReq.Agent || agentReq.Drug;
                const agentDef = agentsData.find(a => a.Agent === drugName);
                
                if (agentDef) {
                    if (!newCycle.selectedAgents[drugName]) {
                        newCycle.selectedAgents[drugName] = {
                            customName: '',
                            schedules: []
                        };
                    }

                    const newSchedule = {
                        id: generateId(),
                        dose: agentReq.Dose || null,
                        dosingDays: agentReq.Dosing_day,
                        customDose: '',
                        customDays: ''
                    };

                    const allowedDays = agentDef.Dosing_day ? agentDef.Dosing_day.split(',').map(d=>d.trim()) : [];
                    if (!allowedDays.includes(agentReq.Dosing_day)) {
                        newSchedule.dosingDays = 'Others';
                        newSchedule.customDays = agentReq.Dosing_day;
                    }
                    
                    if (agentReq.Dose) {
                        const allowedDoses = agentDef.Dose ? agentDef.Dose.split(',').map(d=>d.trim()) : [];
                        if (!allowedDoses.includes(agentReq.Dose)) {
                            newSchedule.dose = 'Others';
                            newSchedule.customDose = agentReq.Dose;
                        }
                    }
                    
                    newCycle.selectedAgents[drugName].schedules.push(newSchedule);
                } else {
                    newCycle.selectedAgents['Others'] = {
                        customName: drugName,
                        schedules: [{
                            id: generateId(),
                            dose: 'Others',
                            dosingDays: 'Others',
                            customDose: '',
                            customDays: agentReq.Dosing_day
                        }]
                    };
                }
            });
            
            cycles.push(newCycle);
        });
    });
    
    // Calculate start dates
    const today = new Date();
    let currentDate = new Date(today);
    cycles.forEach(c => {
        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getDate()).padStart(2, '0');
        c.startDate = `${yyyy}-${mm}-${dd}`;
        
        currentDate.setDate(currentDate.getDate() + parseInt(c.lengthDays));
    });

    if (cycles.length > 0) {
        selectCycle(cycles[0].id);
    } else {
        renderSidebar();
        updateMainContent();
    }
}

// Cycle Management
function addCycle() {
    const inputEl = document.getElementById('new-cycle-input');
    const customName = inputEl ? inputEl.value.trim() : '';
    
    let cycleNames = [];
    if (customName) {
        const parsed = parseCycleRange(customName.replace(/cycle/i, '').trim());
        if (parsed.length > 0) {
            cycleNames = parsed.map(n => `Cycle ${n}`);
        } else {
            cycleNames = [customName];
        }
    } else {
        const cycleNum = cycles.length + 1;
        cycleNames = [`Cycle ${cycleNum}`];
    }
    
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    let firstId = null;
    
    cycleNames.forEach(cycleName => {
        const newCycle = {
            id: generateId(),
            name: cycleName,
            startDate: todayStr,
            lengthDays: '28',
            selectedAgents: {}, // agent.Agent -> { customName: '', schedules: [{...}] }
        };
        cycles.push(newCycle);
        if (!firstId) firstId = newCycle.id;
    });
    
    if (inputEl) inputEl.value = '';
    
    if (firstId) {
        selectCycle(firstId);
    }
    renderSidebar();
}

function selectCycle(id) {
    currentCycleId = id;
    renderSidebar();
    updateMainContent();
}

function deleteCurrentCycle() {
    if (!currentCycleId) return;
    if (confirm('Are you sure you want to delete this cycle?')) {
        cycles = cycles.filter(c => c.id !== currentCycleId);
        if (cycles.length > 0) {
            selectCycle(cycles[cycles.length - 1].id);
        } else {
            currentCycleId = null;
            renderSidebar();
            updateMainContent();
        }
    }
}

function getCycle(id) {
    return cycles.find(c => c.id === id);
}

// UI Rendering
function renderSidebar() {
    cycleListEl.innerHTML = '';
    cycles.forEach((cycle, index) => {
        const el = document.createElement('div');
        el.className = `cycle-item ${cycle.id === currentCycleId ? 'active' : ''}`;
        el.onclick = () => selectCycle(cycle.id);
        
        const agentsCount = Object.keys(cycle.selectedAgents).length;
        let summary = agentsCount > 0 ? `${agentsCount} agent(s)` : 'No agents';
        if (cycle.lengthDays) summary += ` • ${cycle.lengthDays} Days`;
        if (cycle.startDate) {
            const formattedDate = cycle.startDate.slice(2); // YYYY-MM-DD to YY-MM-DD
            summary += `<br>Start: ${formattedDate}`;
        }
        
        el.innerHTML = `
            <div>
                <div class="cycle-name">${cycle.name}</div>
                <div class="cycle-summary">${summary}</div>
            </div>
            ${cycle.id === currentCycleId ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>' : ''}
        `;
        cycleListEl.appendChild(el);
    });
}

function updateMainContent() {
    if (!currentCycleId) {
        emptyStateEl.classList.remove('hidden');
        cyclePlannerEl.classList.add('hidden');
        return;
    }
    
    emptyStateEl.classList.add('hidden');
    cyclePlannerEl.classList.remove('hidden');
    
    const cycle = getCycle(currentCycleId);
    
    const lineSelect = document.getElementById('line-input');
    let lineVal = '';
    if (lineSelect) {
        lineVal = ['Consolidation', 'Maintenance'].includes(lineSelect.value) ? lineSelect.value : `${lineSelect.value} Line`;
    }

    const regimenSelect = document.getElementById('regimen-input');
    let regimenVal = regimenSelect ? regimenSelect.value : '';
    if (regimenVal === 'Others') {
        const customRegimenInput = document.getElementById('custom-regimen-input');
        regimenVal = customRegimenInput ? customRegimenInput.value : '';
    }
    
    currentCycleTitleEl.textContent = regimenVal ? `${lineVal} ${regimenVal} ${cycle.name}`.trim() : `${lineVal} ${cycle.name}`.trim();

    
    const startDateInput = document.getElementById('cycle-start-date');
    const lengthInput = document.getElementById('cycle-length');
    if (startDateInput) startDateInput.value = cycle.startDate || '';
    if (lengthInput) lengthInput.value = cycle.lengthDays || '';
    
    updateCheckboxesForCurrentCycle();
    renderAgentConfigs();
    renderSummary();
}

// Agent Selection
function renderAgentCheckboxes() {
    agentClassesContainer.innerHTML = '';
    
    for (const [className, classAgents] of Object.entries(groupedAgents)) {
        const groupEl = document.createElement('div');
        groupEl.className = 'agent-class-group';
        
        const titleEl = document.createElement('h4');
        titleEl.className = 'class-title';
        titleEl.textContent = className;
        groupEl.appendChild(titleEl);
        
        const listEl = document.createElement('div');
        listEl.className = 'checkbox-list';
        
        classAgents.forEach(agent => {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'checkbox-item-container';
            
            const label = document.createElement('label');
            label.className = 'custom-checkbox';
            
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = agent.Agent;
            input.id = `checkbox-${agent.Agent.replace(/\s+/g, '-')}`;
            
            input.addEventListener('change', (e) => {
                handleAgentSelectionChange(agent, e.target.checked);
                if (agent.Agent === 'Others') {
                    const customInput = document.getElementById('custom-agent-input');
                    if (e.target.checked) {
                        customInput.classList.remove('hidden');
                        customInput.focus();
                    } else {
                        customInput.classList.add('hidden');
                        customInput.value = '';
                    }
                }
            });
            
            label.appendChild(input);
            
            const checkmark = document.createElement('div');
            checkmark.className = 'checkmark';
            label.appendChild(checkmark);
            
            const textContainer = document.createElement('div');
            textContainer.className = 'agent-label';
            const abbr = agent.Abbrevations || agent.Abbreviations;
            textContainer.innerHTML = `
                <span class="agent-name">${agent.Agent}</span>
                ${abbr ? `<span class="agent-abbr">${abbr}</span>` : ''}
            `;
            label.appendChild(textContainer);
            
            itemContainer.appendChild(label);
            
            if (agent.Agent === 'Others') {
                const customInput = document.createElement('input');
                customInput.type = 'text';
                customInput.id = 'custom-agent-input';
                customInput.className = 'custom-text-input hidden';
                customInput.placeholder = 'Enter agent name';
                customInput.addEventListener('input', (e) => {
                    const cycle = getCycle(currentCycleId);
                    if (cycle && cycle.selectedAgents['Others']) {
                        cycle.selectedAgents['Others'].customName = e.target.value;
                        const cardTitle = document.getElementById(`config-title-Others`);
                        if (cardTitle) cardTitle.textContent = e.target.value || 'Others';
                        renderSummary();
                    }
                });
                itemContainer.appendChild(customInput);
            }
            
            listEl.appendChild(itemContainer);
        });
        
        groupEl.appendChild(listEl);
        agentClassesContainer.appendChild(groupEl);
    }
}

function updateCheckboxesForCurrentCycle() {
    if (!currentCycleId) return;
    const cycle = getCycle(currentCycleId);
    
    agentsData.forEach(agent => {
        const input = document.getElementById(`checkbox-${agent.Agent.replace(/\s+/g, '-')}`);
        if (input) {
            input.checked = !!cycle.selectedAgents[agent.Agent];
            if (agent.Agent === 'Others') {
                const customInput = document.getElementById('custom-agent-input');
                if (input.checked) {
                    customInput.classList.remove('hidden');
                    customInput.value = cycle.selectedAgents['Others'].customName || '';
                } else {
                    customInput.classList.add('hidden');
                    customInput.value = '';
                }
            }
        }
    });
}

function handleAgentSelectionChange(agent, isSelected) {
    if (!currentCycleId) return;
    const cycle = getCycle(currentCycleId);
    
    if (isSelected) {
        cycle.selectedAgents[agent.Agent] = {
            customName: '',
            schedules: [{
                id: generateId(),
                dose: null,
                dosingDays: null,
                customDose: '',
                customDays: ''
            }]
        };
    } else {
        delete cycle.selectedAgents[agent.Agent];
    }
    
    renderSidebar();
    renderAgentConfigs();
    renderSummary();
}

// Configuration (Dose & Dosing Days)
function renderAgentConfigs() {
    if (!currentCycleId) return;
    const cycle = getCycle(currentCycleId);
    const selectedAgentNames = Object.keys(cycle.selectedAgents);
    
    if (selectedAgentNames.length === 0) {
        agentConfigsContainer.innerHTML = '<div class="empty-agents">No agents selected for this cycle. Select agents from the list on the left.</div>';
        return;
    }
    
    agentConfigsContainer.innerHTML = '';
    
    const selectedAgents = agentsData.filter(a => selectedAgentNames.includes(a.Agent));
    
    selectedAgents.forEach(agent => {
        const cycleAgentData = cycle.selectedAgents[agent.Agent];
        const card = document.createElement('div');
        card.className = 'config-card';
        
        // Header
        const header = document.createElement('div');
        header.className = 'config-card-header';
        
        const displayAgentName = agent.Agent === 'Others' && cycleAgentData.customName 
            ? cycleAgentData.customName 
            : agent.Agent;
            
        const classSpan = agent.Agent === 'Others' ? '' : ` <span class="config-agent-class">${agent.Class}</span>`;
        header.innerHTML = `
            <div class="config-agent-name" id="config-title-${agent.Agent.replace(/\s+/g, '-')}">${displayAgentName}${classSpan}</div>
        `;
        card.appendChild(header);

        // Schedules Container
        const schedulesContainer = document.createElement('div');
        schedulesContainer.className = 'schedules-container';
        
        cycleAgentData.schedules.forEach((schedule, index) => {
            const scheduleBlock = document.createElement('div');
            scheduleBlock.className = 'schedule-block';
            if (index > 0) scheduleBlock.style.marginTop = '1rem';
            if (index > 0) scheduleBlock.style.paddingTop = '1rem';
            if (index > 0) scheduleBlock.style.borderTop = '1px dashed var(--border-glass)';
            
            const scheduleHeader = document.createElement('div');
            scheduleHeader.style.display = 'flex';
            scheduleHeader.style.justifyContent = 'space-between';
            scheduleHeader.style.alignItems = 'center';
            scheduleHeader.style.marginBottom = '0.5rem';
            
            const scheduleTitle = document.createElement('div');
            scheduleTitle.className = 'config-label';
            scheduleTitle.style.marginBottom = '0';
            scheduleTitle.textContent = `Schedule ${index + 1}`;
            scheduleHeader.appendChild(scheduleTitle);
            
            if (index > 0) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-primary';
                deleteBtn.style.padding = '0.4rem 0.8rem';
                deleteBtn.style.fontSize = '0.85rem';
                deleteBtn.style.border = 'none';
                deleteBtn.style.borderRadius = '0.25rem';
                deleteBtn.style.cursor = 'pointer';
                deleteBtn.textContent = 'Remove';
                deleteBtn.onclick = () => {
                    cycleAgentData.schedules.splice(index, 1);
                    renderAgentConfigs();
                    renderSummary();
                };
                scheduleHeader.appendChild(deleteBtn);
            }
            scheduleBlock.appendChild(scheduleHeader);
            
            // Dose Section
            const doseSection = document.createElement('div');
            doseSection.className = 'config-section';
            
            const doseGroup = document.createElement('div');
            doseGroup.className = 'radio-group';
            
            let doses = agent.Dose ? agent.Dose.split(',').map(d => d.trim()).filter(d => d) : [];
            doses.push('Others');
            
            const customDoseInput = document.createElement('input');
            customDoseInput.type = 'text';
            customDoseInput.className = 'custom-text-input hidden';
            customDoseInput.placeholder = 'e.g. 1.3 mg/m2, 2.5 mg/kg, 40 mg';
            customDoseInput.value = schedule.customDose || '';
            customDoseInput.addEventListener('input', (e) => {
                schedule.customDose = e.target.value;
                renderSummary();
            });

            doses.forEach((dose, i) => {
                const radioId = `dose-${agent.Agent.replace(/\s+/g, '-')}-${schedule.id}-${i}`;
                const option = document.createElement('div');
                option.className = 'radio-option';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `dose-${agent.Agent}-${schedule.id}`;
                input.id = radioId;
                input.value = dose;
                if (schedule.dose === dose) {
                    input.checked = true;
                    if (dose === 'Others') customDoseInput.classList.remove('hidden');
                }
                
                input.addEventListener('change', () => {
                    schedule.dose = dose;
                    if (dose === 'Others') {
                        customDoseInput.classList.remove('hidden');
                        customDoseInput.focus();
                    } else {
                        customDoseInput.classList.add('hidden');
                    }
                    renderSummary();
                });
                
                const label = document.createElement('label');
                label.className = 'radio-label';
                label.setAttribute('for', radioId);
                label.textContent = dose;
                
                option.appendChild(input);
                option.appendChild(label);
                doseGroup.appendChild(option);
            });
            
            doseSection.appendChild(doseGroup);
            doseSection.appendChild(customDoseInput);
            scheduleBlock.appendChild(doseSection);
            
            // Dosing Days Section
            const daysSection = document.createElement('div');
            daysSection.className = 'config-section';
            
            const daysGroup = document.createElement('div');
            daysGroup.className = 'radio-group';
            
            let daysOpts = agent.Dosing_day ? agent.Dosing_day.split(',').map(d => d.trim()).filter(d => d) : [];
            daysOpts.push('Others');
            
            const customDaysInput = document.createElement('input');
            customDaysInput.type = 'text';
            customDaysInput.className = 'custom-text-input hidden';
            customDaysInput.placeholder = 'e.g. D1, D1-4, D1, 4, 8, 11';
            customDaysInput.value = schedule.customDays || '';
            customDaysInput.addEventListener('input', (e) => {
                schedule.customDays = e.target.value;
                renderSummary();
            });

            daysOpts.forEach((dayCode, i) => {
                const radioId = `days-${agent.Agent.replace(/\s+/g, '-')}-${schedule.id}-${i}`;
                const option = document.createElement('div');
                option.className = 'radio-option';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `days-${agent.Agent}-${schedule.id}`;
                input.id = radioId;
                input.value = dayCode;
                if (schedule.dosingDays === dayCode) {
                    input.checked = true;
                    if (dayCode === 'Others') customDaysInput.classList.remove('hidden');
                }
                
                input.addEventListener('change', () => {
                    schedule.dosingDays = dayCode;
                    if (dayCode === 'Others') {
                        customDaysInput.classList.remove('hidden');
                        customDaysInput.focus();
                    } else {
                        customDaysInput.classList.add('hidden');
                    }
                    renderSummary();
                });
                
                const label = document.createElement('label');
                label.className = 'radio-label';
                label.setAttribute('for', radioId);
                const exactDays = dosingDaysMap[dayCode];
                const displayText = (exactDays && dayCode !== 'Others') ? exactDays : dayCode;
                const codeText = document.createTextNode(displayText);
                label.appendChild(codeText);
                
                option.appendChild(input);
                option.appendChild(label);
                daysGroup.appendChild(option);
            });
            
            daysSection.appendChild(daysGroup);
            daysSection.appendChild(customDaysInput);
            scheduleBlock.appendChild(daysSection);
            
            schedulesContainer.appendChild(scheduleBlock);
        });

        card.appendChild(schedulesContainer);

        // Add Schedule Button
        const addScheduleBtn = document.createElement('button');
        addScheduleBtn.className = 'btn-secondary';
        addScheduleBtn.style.width = '100%';
        addScheduleBtn.style.marginTop = '1rem';
        addScheduleBtn.style.padding = '0.5rem';
        addScheduleBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        addScheduleBtn.style.border = '1px dashed var(--border-glass)';
        addScheduleBtn.style.color = 'var(--text-secondary)';
        addScheduleBtn.style.borderRadius = '0.5rem';
        addScheduleBtn.style.cursor = 'pointer';
        addScheduleBtn.style.fontSize = '0.875rem';
        addScheduleBtn.style.fontFamily = 'inherit';
        addScheduleBtn.textContent = '+ Add Schedule';
        addScheduleBtn.onclick = () => {
            cycleAgentData.schedules.push({
                id: generateId(),
                dose: null,
                dosingDays: null,
                customDose: '',
                customDays: ''
            });
            renderAgentConfigs();
            renderSummary();
        };
        addScheduleBtn.onmouseover = () => {
            addScheduleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            addScheduleBtn.style.color = 'var(--text-primary)';
        };
        addScheduleBtn.onmouseout = () => {
            addScheduleBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            addScheduleBtn.style.color = 'var(--text-secondary)';
        };
        card.appendChild(addScheduleBtn);
        
        agentConfigsContainer.appendChild(card);
    });
}

// Summary parsing helper
function parseDosingDays(dayStr) {
    if (!dayStr) return [];
    let s = dayStr.replace(/D/gi, '').trim();
    const parts = s.split(',').map(p => p.trim());
    const days = new Set();
    parts.forEach(p => {
        if (p.includes('-')) {
            const [start, end] = p.split('-').map(x => parseInt(x));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) days.add(i);
            }
        } else {
            const day = parseInt(p);
            if (!isNaN(day)) days.add(day);
        }
    });
    return Array.from(days).sort((a,b) => a - b);
}

// Summary
function renderSummary() {
    if (!currentCycleId) return;
    const cycle = getCycle(currentCycleId);
    const summaryContainer = document.getElementById('summary-container');
    if (!summaryContainer) return;

    const selectedAgentNames = Object.keys(cycle.selectedAgents);
    
    if (selectedAgentNames.length === 0) {
        summaryContainer.innerHTML = '<div class="empty-agents">No configuration to summarize.</div>';
        return;
    }

    // Initialize calendar days
    const cycleLength = parseInt(cycle.lengthDays) || 28;
    const daysMap = {};
    for(let d = 1; d <= cycleLength; d++) {
        daysMap[d] = [];
    }

    selectedAgentNames.forEach(agentName => {
        const data = cycle.selectedAgents[agentName];
        const displayAgentName = agentName === 'Others' && data.customName ? data.customName : agentName;
        
        data.schedules.forEach(schedule => {
            const dose = schedule.dose === 'Others' ? schedule.customDose : (schedule.dose || '');
            const dayStr = schedule.dosingDays === 'Others' ? schedule.customDays : dosingDaysMap[schedule.dosingDays];
            
            const parsedDays = parseDosingDays(dayStr);
            parsedDays.forEach(d => {
                if (d >= 1 && d <= cycleLength) {
                    daysMap[d].push({ name: displayAgentName, dose });
                }
            });
        });
    });

    let startTimestamp = null;
    if (cycle.startDate) {
        const [y, m, d_val] = cycle.startDate.split('-');
        startTimestamp = new Date(y, m - 1, d_val).getTime();
    }

    let calendarHtml = '<div class="calendar-grid">';
    for(let d = 1; d <= cycleLength; d++) {
        let actualDateStr = '';
        if (startTimestamp) {
            const dObj = new Date(startTimestamp + (d - 1) * 24 * 60 * 60 * 1000);
            actualDateStr = `${dObj.getMonth()+1}/${dObj.getDate()}`;
        }
        
        calendarHtml += `<div class="calendar-day">`;
        calendarHtml += `<div class="calendar-day-header"><strong>D${d}</strong> ${actualDateStr ? `<span style="opacity:0.7">${actualDateStr}</span>` : ''}</div>`;
        
        daysMap[d].forEach(event => {
            calendarHtml += `
                <div class="calendar-event">
                    <span class="calendar-event-abbr">${event.name}</span>
                    ${event.dose ? `<span class="calendar-event-dose">${event.dose}</span>` : ''}
                </div>
            `;
        });
        
        calendarHtml += `</div>`; // .calendar-day
    }
    calendarHtml += '</div>';

    const regimenSelect = document.getElementById('regimen-input');
    let regimenVal = regimenSelect ? regimenSelect.value : '';
    if (regimenVal === 'Others') {
        const customRegimenInput = document.getElementById('custom-regimen-input');
        regimenVal = customRegimenInput ? customRegimenInput.value : '';
    }
    const metaHtml = `
        <div class="summary-meta" style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px dashed var(--border-glass); color: var(--text-secondary); font-size: 0.875rem;">
            ${regimenVal ? `<div><strong>Regimen:</strong> <span style="color:var(--text-primary)">${regimenVal}</span></div>` : ''}
            <div><strong>Cycle:</strong> <span style="color:var(--text-primary)">${cycle.name.replace(/^Cycle\s+/i, '')}</span></div>
            <div><strong>Start:</strong> <span style="color:var(--text-primary)">${cycle.startDate ? cycle.startDate.slice(2) : '-'}</span></div>
            <div><strong>Length:</strong> <span style="color:var(--text-primary)">${cycle.lengthDays || '-'} days</span></div>
        </div>
    `;

    summaryContainer.innerHTML = metaHtml + calendarHtml;
}

// Run app
document.addEventListener('DOMContentLoaded', loadData);

// Set default date for any date inputs to today
document.addEventListener('DOMContentLoaded', () => {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => {
            if (!input.value) {
                input.value = today;
                input.setAttribute('data-date', today);
            } else {
                input.setAttribute('data-date', input.value);
            }
            
            input.addEventListener('change', function() {
                this.setAttribute('data-date', this.value);
            });
        });
    }
});
