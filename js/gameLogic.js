const possibleMoves = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const moveClasses = {
    'ArrowUp': 'dir-up',
    'ArrowDown': 'dir-down',
    'ArrowLeft': 'dir-left',
    'ArrowRight': 'dir-right'
};

const oppositeMove = {
    'ArrowUp': 'ArrowDown',
    'ArrowDown': 'ArrowUp',
    'ArrowLeft': 'ArrowRight',
    'ArrowRight': 'ArrowLeft'
};

const miniArrowGlyphs = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→'
};

const arrowSvgHTML = `
    <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
`;

let sequence = [];
let chanceIndices = new Set();
let currentIndex = 0;
let startTime = null;
let isPlaying = false;
let timerInterval = null;
let errorTimeout = null;
const completeHistory = [];

const startScreen = document.getElementById('startScreen');
const sequenceBox = document.getElementById('sequenceBox');
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const timerDisplay = document.getElementById('timerDisplay');
const arrowCountSelect = document.getElementById('arrowCount');
const historyList = document.getElementById('historyList');
const chanceToggle = document.getElementById('chanceToggle');

// Cycles: 0 = off, 1–6 = count
let chanceValue = 0;
const CHANCE_MAX = 6;

chanceToggle.addEventListener('click', () => {
    chanceValue = chanceValue >= CHANCE_MAX ? 0 : chanceValue + 1;
    updateChancePill();
});

function updateChancePill() {
    if (chanceValue === 0) {
        chanceToggle.textContent = 'Off';
        chanceToggle.classList.remove('active');
    } else {
        chanceToggle.textContent = chanceValue;
        chanceToggle.classList.add('active');
    }
}

playBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        timerDisplay.innerText = `${elapsed}s`;
    }, 10);
}

function startGame() {
    clearInterval(timerInterval);
    if (errorTimeout) { clearTimeout(errorTimeout); errorTimeout = null; }
    sequence = [];
    chanceIndices = new Set();
    currentIndex = 0;
    startTime = null;
    isPlaying = true;
    timerDisplay.innerText = '0.00s';

    const count = parseInt(arrowCountSelect.value, 10);
    arrowCountSelect.blur();

    for (let i = 0; i < count; i++) {
        sequence.push(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
    }

    // Assign chance indices
    if (chanceValue > 0) {
        const numChance = Math.min(chanceValue, count);
        const allIndices = Array.from({ length: count }, (_, i) => i);
        // Fisher-Yates shuffle to pick random indices
        for (let i = allIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
        }
        allIndices.slice(0, numChance).forEach(idx => chanceIndices.add(idx));
    }

    startScreen.classList.add('hidden');
    sequenceBox.classList.remove('hidden');

    startTimer();
    renderSequence();
}

function resetGame() {
    clearInterval(timerInterval);
    sequence = [];
    chanceIndices = new Set();
    currentIndex = 0;
    startTime = null;
    isPlaying = false;
    sequenceBox.innerHTML = '';
    timerDisplay.innerText = '0.00s';

    startScreen.classList.remove('hidden');
    sequenceBox.classList.add('hidden');
}

// Build a token element for the given sequence index
// showOpposite: whether to display the flipped arrow icon (for chance tokens showing "what to press")
// state: 'normal' | 'active' | 'correct' | 'error'
function buildTokenElement(index, state, showFlippedIcon) {
    const move = sequence[index];
    const isChance = chanceIndices.has(index);

    const wrapper = document.createElement('div');
    wrapper.classList.add('arrow-token');
    wrapper.id = `token-${index}`;

    if (isChance) wrapper.classList.add('chance');

    // Which direction to visually display
    const displayMove = (isChance && showFlippedIcon) ? oppositeMove[move] : move;

    const arrowIcon = document.createElement('div');
    arrowIcon.classList.add(moveClasses[displayMove]);
    arrowIcon.innerHTML = arrowSvgHTML;

    wrapper.appendChild(arrowIcon);

    if (state === 'active') wrapper.classList.add('active');
    if (state === 'correct') wrapper.classList.add('correct');
    if (state === 'error') wrapper.classList.add('error');

    return wrapper;
}

function renderSequence(correctUpTo = 0) {
    sequenceBox.innerHTML = '';

    sequence.forEach((move, index) => {
        let state = 'normal';
        let showFlipped = false;

        if (index < correctUpTo) {
            state = 'correct';
            // Completed chance tokens show the opposite (flipped) arrow to confirm what was pressed
            showFlipped = chanceIndices.has(index);
        } else if (index === currentIndex) {
            state = 'active';
            // Active chance tokens show ORIGINAL arrow — user must figure out to press opposite
            showFlipped = false;
        }
        // Pending tokens always show original arrow

        const el = buildTokenElement(index, state, showFlipped);
        sequenceBox.appendChild(el);
    });
}

function pushToHistoryLog(completedSequence, recordedDuration) {
    completeHistory.unshift({ runSequence: [...completedSequence], chanceSet: new Set(chanceIndices), duration: recordedDuration });

    if (completeHistory.length > 5) {
        completeHistory.pop();
    }

    renderHistoryLogUI();
}

function renderHistoryLogUI() {
    if (completeHistory.length === 0) {
        historyList.innerHTML = `<li class="history-empty">No completions yet</li>`;
        return;
    }

    historyList.innerHTML = completeHistory.map(entry => {
        const arrowSequenceString = entry.runSequence.map((move, i) => {
            const glyph = miniArrowGlyphs[move];
            return entry.chanceSet.has(i)
                ? `<span class="mini-chance">${miniArrowGlyphs[oppositeMove[move]]}</span>`
                : glyph;
        }).join('');
        return `
            <li class="history-item">
                <span class="mini-seq">${arrowSequenceString}</span>
                <strong>${entry.duration}s</strong>
            </li>
        `;
    }).join('');
}

window.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.code === 'Space' || event.key === 'Control') {
        if (document.activeElement !== arrowCountSelect) {
            event.preventDefault();
            startGame();
        }
        return;
    }

    if (event.key === 'Delete') {
        event.preventDefault();
        chanceValue = chanceValue >= CHANCE_MAX ? 0 : chanceValue + 1;
        updateChancePill();
        return;
    }

    if (!isPlaying || !possibleMoves.includes(event.key)) return;

    event.preventDefault();

    const isChance = chanceIndices.has(currentIndex);
    // Chance tokens show the ORIGINAL arrow but require the OPPOSITE key to clear
    const requiredKey = isChance ? oppositeMove[sequence[currentIndex]] : sequence[currentIndex];

    if (event.key === requiredKey) {
        // Correct press — cancel any pending error reset
        if (errorTimeout) { clearTimeout(errorTimeout); errorTimeout = null; }
        const correctUpTo = currentIndex + 1;
        currentIndex++;

        if (currentIndex < sequence.length) {
            renderSequence(correctUpTo);
        } else {
            // Completed!
            isPlaying = false;
            clearInterval(timerInterval);
            const finalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            timerDisplay.innerText = `${finalTime}s`;

            renderSequence(sequence.length);
            pushToHistoryLog(sequence, finalTime);
        }
    } else {
        // Wrong key — reset to start, revert all chance tokens to original (unflipped) display
        currentIndex = 0;

        // Temporarily mark as error then re-render
        if (errorTimeout) clearTimeout(errorTimeout);
        renderSequenceWithError();
    }
});

function renderSequenceWithError() {
    sequenceBox.innerHTML = '';

    sequence.forEach((move, index) => {
        // On error: ALL tokens go back to unflipped original display
        // (chance tokens show original direction in red, not the flipped)
        const wrapper = document.createElement('div');
        wrapper.classList.add('arrow-token');
        wrapper.id = `token-${index}`;

        if (chanceIndices.has(index)) wrapper.classList.add('chance');

        const arrowIcon = document.createElement('div');
        // On error reset: show ORIGINAL (unflipped) direction for chance tokens
        arrowIcon.classList.add(moveClasses[move]);
        arrowIcon.innerHTML = arrowSvgHTML;
        wrapper.appendChild(arrowIcon);

        if (index === 0) wrapper.classList.add('active', 'error');

        sequenceBox.appendChild(wrapper);
    });

    // Remove error class after shake animation, restore normal state
    errorTimeout = setTimeout(() => {
        errorTimeout = null;
        renderSequence(0);
    }, 350);
}