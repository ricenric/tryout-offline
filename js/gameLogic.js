const possibleMoves = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const moveClasses = {
    'ArrowUp': 'dir-up',
    'ArrowDown': 'dir-down',
    'ArrowLeft': 'dir-left',
    'ArrowRight': 'dir-right'
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
let currentIndex = 0;
let startTime = null;
let isPlaying = false;
let timerInterval = null;
const completeHistory = []; 

const startScreen = document.getElementById('startScreen');
const sequenceBox = document.getElementById('sequenceBox');
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const timerDisplay = document.getElementById('timerDisplay');
const arrowCountSelect = document.getElementById('arrowCount');
const historyList = document.getElementById('historyList');

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
    sequence = [];
    currentIndex = 0;
    startTime = null;
    isPlaying = true;
    timerDisplay.innerText = '0.00s';

    const count = parseInt(arrowCountSelect.value, 10);
    arrowCountSelect.blur();
    
    for (let i = 0; i < count; i++) {
        sequence.push(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
    }
    
    startScreen.classList.add('hidden');
    sequenceBox.classList.remove('hidden');

    startTimer();
    renderSequence();
}

function resetGame() {
    clearInterval(timerInterval);
    sequence = [];
    currentIndex = 0;
    startTime = null;
    isPlaying = false;
    sequenceBox.innerHTML = '';
    timerDisplay.innerText = '0.00s';

    startScreen.classList.remove('hidden');
    sequenceBox.classList.add('hidden');
}

function renderSequence() {
    sequenceBox.innerHTML = '';
    sequence.forEach((move, index) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('arrow-token');
        if (index === 0) wrapper.classList.add('active');
        
        const arrowIcon = document.createElement('div');
        arrowIcon.classList.add(moveClasses[move]);
        arrowIcon.innerHTML = arrowSvgHTML;
        
        wrapper.appendChild(arrowIcon);
        wrapper.id = `token-${index}`;
        sequenceBox.appendChild(wrapper);
    });
}

function pushToHistoryLog(completedSequence, recordedDuration) {
    completeHistory.unshift({ runSequence: [...completedSequence], duration: recordedDuration });
    
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
        const arrowSequenceString = entry.runSequence.map(move => miniArrowGlyphs[move]).join('');
        return `
            <li class="history-item">
                <span class="mini-seq">${arrowSequenceString}</span>
                <strong>${entry.duration}s</strong>
            </li>
        `;
    }).join('');
}

window.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.code === 'Space') {
        if (document.activeElement !== arrowCountSelect) {
            event.preventDefault(); 
            startGame();
        }
        return;
    }

    if (!isPlaying || !possibleMoves.includes(event.key)) return;
    
    event.preventDefault();
    
    const currentToken = document.getElementById(`token-${currentIndex}`);
    
    if (event.key === sequence[currentIndex]) {
        currentToken.classList.remove('active', 'error');
        currentToken.classList.add('correct');
        currentIndex++;
        
        if (currentIndex < sequence.length) {
            const nextToken = document.getElementById(`token-${currentIndex}`);
            nextToken.classList.add('active');
        } else {
            isPlaying = false;
            clearInterval(timerInterval);
            const finalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            timerDisplay.innerText = `${finalTime}s`;
            
            pushToHistoryLog(sequence, finalTime);
        }
    } else {
        currentIndex = 0;
        
        sequence.forEach((_, index) => {
            const token = document.getElementById(`token-${index}`);
            token.classList.remove('correct', 'active', 'error');
            
            if (index === 0) {
                token.classList.add('active');
            }
        });

        void currentToken.offsetWidth; 
        currentToken.classList.add('error');
    }
});