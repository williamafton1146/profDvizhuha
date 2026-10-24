const STORAGE_KEY = "profDvizhuha_save_v67_v12";
const THEME_KEY = "profDvizhuha_theme_v67";

const state = {
    callsign: "67zov",
    difficulty: "easy",
    gameMode: "standard",
    activeScenarios: [],
    emergencyIndices: [],
    caseIndex: 0,
    reputation: 100,
    correctCount: 0,
    caseResolved: false,
    timerId: null,
    timeLeft: 0,
    emergencyTimerId: null,
    emergencyActive: false,
    bruteTarget: "",
    bruteInput: [],
    bruteTries: 10,
    traceCurrentStep: 1,
    traceTargetOrder: [],
    isMuted: false,
    currentTheme: "menu",
    isLightTheme: false
};

const screens = {
    start: document.getElementById("screen-start"),
    game: document.getElementById("screen-game"),
    result: document.getElementById("screen-result")
};

function stopAllAudio(resetTime = false) {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach(audio => {
        audio.pause();
        if (resetTime) {
            audio.currentTime = 0;
        }
    });
}

function playAudioTheme(themeName, resetTime = true) {
    if (themeName) {
        state.currentTheme = themeName;
    }

    const audioElements = {
        menu: document.getElementById("snd-menu"),
        easy: document.getElementById("snd-easy"),
        medium: document.getElementById("snd-medium"),
        hard: document.getElementById("snd-hard"),
        finish: document.getElementById("snd-finish")
    };

    const targetAudio = audioElements[state.currentTheme];

    Object.entries(audioElements).forEach(([key, audio]) => {
        if (!audio) return;
        if (key !== state.currentTheme) {
            audio.pause();
            audio.currentTime = 0;
        } else if (resetTime) {
            audio.currentTime = 0;
        }
    });

    if (state.isMuted || !targetAudio) {
        if (targetAudio) targetAudio.pause();
        return;
    }

    targetAudio.volume = 0.25;
    targetAudio.play().catch(() => {});
}

function applyTheme(isLight) {
    state.isLightTheme = isLight;
    const themeBtn = document.getElementById("btn-theme-toggle");
    if (isLight) {
        document.body.classList.add("light-theme");
        if (themeBtn) themeBtn.textContent = "☾ ТЁМНАЯ";
    } else {
        document.body.classList.remove("light-theme");
        if (themeBtn) themeBtn.textContent = "☀ СВЕТЛАЯ";
    }
    localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}

function goHomeScreen() {
    clearInterval(state.timerId);
    clearInterval(state.emergencyTimerId);
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
    checkSavedProgress();
    switchScreen("start");
    playAudioTheme("menu", true);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    applyTheme(savedTheme === "light");

    initStartScreen();
    checkSavedProgress();
    loadLeaderboard();
    playAudioTheme("menu", true);

    const brandHomeBtn = document.getElementById("btn-brand-home");
    if (brandHomeBtn) {
        brandHomeBtn.addEventListener("click", goHomeScreen);
    }

    const themeToggleBtn = document.getElementById("btn-theme-toggle");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            applyTheme(!state.isLightTheme);
        });
    }

    const soundToggleBtn = document.getElementById("btn-sound-toggle");
    soundToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.isMuted = !state.isMuted;

        if (state.isMuted) {
            stopAllAudio(false);
            soundToggleBtn.textContent = "🔇 SOUND: OFF";
            soundToggleBtn.style.borderColor = "var(--danger)";
            soundToggleBtn.style.color = "var(--danger)";
        } else {
            soundToggleBtn.textContent = "🔊 SOUND: ON";
            soundToggleBtn.style.borderColor = "var(--neon-dim)";
            soundToggleBtn.style.color = "var(--text-main)";
            playAudioTheme(state.currentTheme, false);
        }
    });

    const lbModal = document.getElementById("modal-leaderboard");
    document.getElementById("btn-open-leaderboard").addEventListener("click", () => {
        loadLeaderboard();
        lbModal.classList.remove("hidden");
    });
    document.getElementById("btn-close-leaderboard").addEventListener("click", () => {
        lbModal.classList.add("hidden");
    });

    const guideModal = document.getElementById("modal-guide");
    document.getElementById("btn-open-guide").addEventListener("click", () => {
        guideModal.classList.remove("hidden");
    });
    document.getElementById("btn-close-guide").addEventListener("click", () => {
        guideModal.classList.add("hidden");
    });

    const downloadPdfBtn = document.getElementById("btn-download-pdf");
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener("click", downloadCertificatePDF);
    }

    const unlockAudio = () => {
        if (!state.isMuted) {
            playAudioTheme(state.currentTheme, false);
        }
        document.removeEventListener("click", unlockAudio);
        document.removeEventListener("keydown", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);
});

function initStartScreen() {
    const diffCards = document.querySelectorAll(".diff-card");
    diffCards.forEach(card => {
        card.addEventListener("click", () => {
            diffCards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            state.difficulty = card.dataset.diff;
        });
    });

    const modeBtns = document.querySelectorAll(".mode-btn");
    modeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            modeBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.gameMode = btn.dataset.mode;
        });
    });

    document.getElementById("btn-start-game").addEventListener("click", () => {
        const inputVal = document.getElementById("player-callsign").value.trim();
        state.callsign = inputVal || "67zov";
        state.caseIndex = 0;
        state.reputation = 100;
        state.correctCount = 0;

        buildActiveScenarios();
        checkCallsignMemes(state.callsign);
        saveProgress();
        switchScreen("game");

        if (state.difficulty === "easy") playAudioTheme("easy", true);
        else if (state.difficulty === "medium") playAudioTheme("medium", true);
        else playAudioTheme("hard", true);

        loadCase(0);
    });

    document.getElementById("btn-continue-game").addEventListener("click", () => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        Object.assign(state, saved);
        switchScreen("game");

        if (state.difficulty === "easy") playAudioTheme("easy", true);
        else if (state.difficulty === "medium") playAudioTheme("medium", true);
        else playAudioTheme("hard", true);

        loadCase(state.caseIndex);
        showToast("Движуха продолжается!", `С возвращением, ${state.callsign}!`);
    });

    document.getElementById("btn-next-case").addEventListener("click", () => {
        if (state.gameMode === "standard") {
            if (state.emergencyIndices.includes(state.caseIndex)) {
                triggerRandomEmergency();
                return;
            }
        } else if (state.gameMode === "marathon") {
            if (state.caseIndex > 0 && state.caseIndex % 10 === 0) {
                triggerRandomEmergency();
                return;
            }
        }

        if (state.caseIndex + 1 < state.activeScenarios.length) {
            state.caseIndex++;
            saveProgress();
            loadCase(state.caseIndex);
        } else {
            finishGame();
        }
    });

    document.getElementById("btn-restart").addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        goHomeScreen();
    });

    document.querySelectorAll(".scan-btn").forEach(btn => {
        btn.addEventListener("click", () => runScanner(btn.dataset.tool, btn));
    });

    document.querySelectorAll(".verdict-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            submitVerdict(btn.dataset.verdict);
            const topElement = document.getElementById("workstation-top");
            if (topElement) {
                topElement.scrollIntoView({ behavior: "smooth" });
            }
        });
    });
}

async function loadLeaderboard() {
    try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        const container = document.getElementById("modal-leaderboard-rows");
        if (!container) return;
        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="lb-row"><span>Нет записей в реестре</span><span>—</span><span>0</span></div>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement("div");
            row.className = "lb-row";
            row.innerHTML = `
                <span>${item.callsign}</span>
                <span style="color:var(--text-muted);font-size:11px;">${item.difficulty}</span>
                <span>⭐ ${item.reputation}</span>
            `;
            container.appendChild(row);
        });
    } catch (e) {
        const container = document.getElementById("modal-leaderboard-rows");
        if (container) {
            container.innerHTML = `<div class="lb-row"><span>Ошибка синхронизации Базы</span><span>—</span><span>0</span></div>`;
        }
    }
}

function buildActiveScenarios() {
    state.activeScenarios = [];
    state.emergencyIndices = [];

    if (state.gameMode === "standard") {
        BASE_SCENARIOS.forEach(branch => {
            const randomCase = branch[Math.floor(Math.random() * branch.length)];
            state.activeScenarios.push(randomCase);
        });

        const possibleIndices = [0, 1, 2, 3];
        possibleIndices.sort(() => Math.random() - 0.5);
        const countOfEvents = Math.floor(Math.random() * 3);
        state.emergencyIndices = possibleIndices.slice(0, countOfEvents);
    } else {
        BASE_SCENARIOS.forEach(branch => {
            branch.forEach(c => state.activeScenarios.push(c));
        });
        state.activeScenarios.sort(() => Math.random() - 0.5);
    }
}

function checkCallsignMemes(name) {
    const low = name.toLowerCase();
    if (low.includes("центр") || low.includes("инвест") || low.includes("centrinvest")) {
        showToast("Партнерский код активирован!", "Добро пожаловать, эксперт банка Центр-инвест!");
    } else if (low.includes("67") || low.includes("zov") || low.includes("зов") || low.includes("путин") || low.includes("россия")) {
        showToast("Код Базы 67 активен!", "Патриотический позывной: Россия, Путин, Победа!");
    }
}

function checkSavedProgress() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const continueBtn = document.getElementById("btn-continue-game");
    if (raw) continueBtn.classList.remove("hidden");
    else continueBtn.classList.add("hidden");
}

function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        callsign: state.callsign,
        difficulty: state.difficulty,
        gameMode: state.gameMode,
        activeScenarios: state.activeScenarios,
        emergencyIndices: state.emergencyIndices,
        caseIndex: state.caseIndex,
        reputation: state.reputation,
        correctCount: state.correctCount
    }));
}

function switchScreen(target) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[target].classList.add("active");
}

function updateHUD() {
    const cfg = DIFFICULTY_CONFIG[state.difficulty];
    document.getElementById("hud-name").textContent = state.callsign;
    document.getElementById("hud-diff").textContent = cfg.name;
    document.getElementById("hud-rep").textContent = state.reputation;

    const total = state.activeScenarios.length;
    const current = state.caseIndex + 1;
    document.getElementById("prog-title-label").textContent = state.gameMode === "marathon" ? "МАРАФОН 50 ЗАДАНИЙ" : "ПРОГРЕСС СМЕНЫ";
    document.getElementById("prog-digits").innerHTML = `${String(current).padStart(2, "0")}<span>/</span>${String(total).padStart(2, "0")}`;

    const barsContainer = document.getElementById("prog-bars");
    barsContainer.innerHTML = "";
    const maxBars = Math.min(10, total);
    for (let i = 0; i < maxBars; i++) {
        const span = document.createElement("span");
        span.className = `bar ${i <= (state.caseIndex % maxBars) ? "active" : ""}`;
        barsContainer.appendChild(span);
    }
}

function loadCase(index) {
    clearInterval(state.timerId);
    state.caseResolved = false;
    const item = state.activeScenarios[index];
    const cfg = DIFFICULTY_CONFIG[state.difficulty];

    updateHUD();

    document.getElementById("case-code").textContent = `СЦЕНАРИЙ ${index + 1} // ${item.id}`;
    document.getElementById("case-headline").textContent = item.headline;
    document.getElementById("mentor-text").textContent = cfg.showHints ? item.mentorHint : item.mentorDefault;

    document.getElementById("d-type").textContent = item.type;
    document.getElementById("d-sender").textContent = item.sender;
    document.getElementById("d-amount").textContent = item.amount;
    document.getElementById("d-ip").textContent = item.ip;
    document.getElementById("d-desc").textContent = item.desc;

    const log = document.getElementById("console-log");
    log.innerHTML = `
        <div class="log-line">&gt; Загружен инцидент вариации ${item.id}...</div>
        <div class="log-line">&gt; Запустите сканеры выше для анализа цифровых улик.</div>
    `;

    document.querySelectorAll(".scan-btn").forEach(b => b.classList.remove("used"));
    document.querySelectorAll(".verdict-btn").forEach(b => b.disabled = false);
    document.getElementById("debrief-box").classList.add("hidden");

    const timerEl = document.getElementById("case-timer");
    if (!cfg.timeLimit) {
        timerEl.textContent = "⏱ Без лимита";
    } else {
        state.timeLeft = cfg.timeLimit;
        timerEl.textContent = `⏱ ${state.timeLeft}с`;
        state.timerId = setInterval(() => {
            state.timeLeft--;
            timerEl.textContent = `⏱ ${state.timeLeft}с`;
            if (state.timeLeft <= 0) {
                clearInterval(state.timerId);
                submitVerdict("timeout");
            }
        }, 1000);
    }
}

function runScanner(toolKey, btnEl) {
    if (state.caseResolved) return;
    const item = state.activeScenarios[state.caseIndex];
    const clue = item.clues[toolKey];
    if (!clue || btnEl.classList.contains("used")) return;

    btnEl.classList.add("used");
    const log = document.getElementById("console-log");
    const div = document.createElement("div");

    const colorClass = clue.level === "ok" ? "log-ok" : clue.level === "warn" ? "log-warn" : "log-danger";
    div.className = `log-line ${colorClass}`;
    div.textContent = `> ${clue.text}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function submitVerdict(choice) {
    if (state.caseResolved) return;
    state.caseResolved = true;
    clearInterval(state.timerId);

    const item = state.activeScenarios[state.caseIndex];
    const cfg = DIFFICULTY_CONFIG[state.difficulty];
    const isCorrect = choice === item.correctVerdict;

    document.querySelectorAll(".verdict-btn").forEach(b => b.disabled = true);

    const debriefBox = document.getElementById("debrief-box");
    const titleEl = document.getElementById("debrief-title");
    const textEl = document.getElementById("debrief-text");

    if (isCorrect) {
        state.reputation += 20;
        state.correctCount++;
        titleEl.textContent = "✅ Верное решение! Угроза отработана (+20 очков)";
        titleEl.style.color = "var(--neon-green)";
    } else {
        state.reputation = Math.max(0, state.reputation - cfg.penalty);
        titleEl.textContent = choice === "timeout"
            ? `⏰ Время вышло! Упущена движуха (-${cfg.penalty} очков)`
            : `❌ Ошибка оператора! Неверный вердикт (-${cfg.penalty} очков)`;
        titleEl.style.color = "var(--danger)";
    }

    textEl.textContent = item.debrief;
    debriefBox.classList.remove("hidden");
    updateHUD();
}

function triggerRandomEmergency() {
    const games = ["ddos", "brute", "deepfake", "trace"];
    const chosen = games[Math.floor(Math.random() * games.length)];

    if (chosen === "ddos") startDdosMinigame();
    else if (chosen === "brute") startBruteForceMinigame();
    else if (chosen === "deepfake") startDeepfakeMinigame();
    else startTraceMinigame();
}

function startDdosMinigame() {
    const modal = document.getElementById("modal-ddos");
    const grid = document.getElementById("nodes-grid");
    modal.classList.remove("hidden");
    grid.innerHTML = "";

    let cleaned = 0;
    let time = 12;
    const target = 8;

    document.getElementById("ddos-score").textContent = `0 / ${target}`;
    document.getElementById("ddos-timer").textContent = `${time}с`;

    const nodes = [];
    for (let i = 1; i <= 12; i++) {
        const btn = document.createElement("button");
        btn.className = "srv-node";
        btn.textContent = `SRV-${i}`;
        btn.addEventListener("click", () => {
            if (btn.classList.contains("infected")) {
                btn.classList.remove("infected");
                btn.classList.add("secured");
                cleaned++;
                document.getElementById("ddos-score").textContent = `${cleaned} / ${target}`;
                if (cleaned >= target) endEmergencyModal("modal-ddos", true, 25, "Щит ZOV выстоял! DDoS отбит!");
                else infectRandomNode(nodes, "srv-node", "infected", "secured");
            }
        });
        grid.appendChild(btn);
        nodes.push(btn);
    }

    infectRandomNode(nodes, "srv-node", "infected", "secured");
    infectRandomNode(nodes, "srv-node", "infected", "secured");

    state.emergencyTimerId = setInterval(() => {
        time--;
        document.getElementById("ddos-timer").textContent = `${time}с`;
        infectRandomNode(nodes, "srv-node", "infected", "secured");
        if (time <= 0) endEmergencyModal("modal-ddos", false, 15, "Перегрузка шлюза! Время истекло.");
    }, 1000);
}

function infectRandomNode(nodes, nodeClass, infClass, secClass) {
    const available = nodes.filter(n => !n.classList.contains(infClass) && !n.classList.contains(secClass));
    if (available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    pick.classList.add(infClass);
}

// СЕЙФ: 2 ЦИФРЫ И 10 ПОПЫТОК
function startBruteForceMinigame() {
    const modal = document.getElementById("modal-brute");
    modal.classList.remove("hidden");

    state.bruteTarget = String(Math.floor(10 + Math.random() * 90));
    state.bruteInput = [];
    state.bruteTries = 10;
    let time = 45;

    updateBruteDisplay();
    document.getElementById("brute-tries").textContent = state.bruteTries;
    document.getElementById("brute-timer").textContent = `${time}с`;
    document.getElementById("brute-hint").textContent = "Подсказка: Введите 2 цифры кода доступа.";

    const pad = document.getElementById("brute-keypad");
    pad.innerHTML = "";
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement("button");
        btn.className = "brute-key";
        btn.textContent = String(i);
        btn.addEventListener("click", () => handleBruteDigit(String(i)));
        pad.appendChild(btn);
    }

    state.emergencyTimerId = setInterval(() => {
        time--;
        document.getElementById("brute-timer").textContent = `${time}с`;
        if (time <= 0) endEmergencyModal("modal-brute", false, 15, "Время истекло! Сейф заблокирован.");
    }, 1000);
}

function handleBruteDigit(digit) {
    if (state.bruteInput.length < 2) {
        state.bruteInput.push(digit);
        updateBruteDisplay();

        if (state.bruteInput.length === 2) {
            const entered = state.bruteInput.join("");
            if (entered === state.bruteTarget) {
                endEmergencyModal("modal-brute", true, 25, "Шифр успешно подобран! Сейф защищен.");
            } else {
                state.bruteTries--;
                document.getElementById("brute-tries").textContent = state.bruteTries;
                const hint = document.getElementById("brute-hint");
                if (parseInt(entered) < parseInt(state.bruteTarget)) {
                    hint.textContent = `❌ Код ${entered} МЕНЬШЕ целевого! Бери выше.`;
                } else {
                    hint.textContent = `❌ Код ${entered} БОЛЬШЕ целевого! Бери ниже.`;
                }
                state.bruteInput = [];
                if (state.bruteTries <= 0) {
                    endEmergencyModal("modal-brute", false, 15, "Исчерпаны все попытки подбора кода.");
                }
            }
        }
    }
}

function updateBruteDisplay() {
    const arr = [...state.bruteInput];
    while (arr.length < 2) arr.push("_");
    document.getElementById("brute-code-display").textContent = arr.join(" ");
}

function startDeepfakeMinigame() {
    const modal = document.getElementById("modal-deepfake");
    const grid = document.getElementById("deepfake-grid");
    modal.classList.remove("hidden");
    grid.innerHTML = "";

    let time = 25;
    const streams = [
        { title: "Поток #01: Биометрия стабильна (РФ)", fake: false },
        { title: "Поток #02: Артефакты нейросети", fake: true },
        { title: "Поток #03: ГОСТ-сигнал верифицирован", fake: false },
        { title: "Поток #04: Обычный офисный узел", fake: false }
    ];
    streams.sort(() => Math.random() - 0.5);

    streams.forEach(st => {
        const card = document.createElement("div");
        card.className = "df-card";
        card.innerHTML = `<strong>${st.title}</strong><br><span style="color:var(--text-muted);font-size:11px;">Кликни для проверки потока</span>`;
        card.addEventListener("click", () => {
            if (st.fake) {
                card.classList.add("selected-right");
                endEmergencyModal("modal-deepfake", true, 25, "Дипфейк-поток успешно выявлен и заблокирован!");
            } else {
                card.classList.add("selected-wrong");
                endEmergencyModal("modal-deepfake", false, 15, "Ошибка! Заблокирован легитимный поток.");
            }
        });
        grid.appendChild(card);
    });

    state.emergencyTimerId = setInterval(() => {
        time--;
        document.getElementById("df-timer").textContent = `${time}с`;
        if (time <= 0) endEmergencyModal("modal-deepfake", false, 15, "Время вышло! Дипфейк прошел проверку.");
    }, 1000);
}

function startTraceMinigame() {
    const modal = document.getElementById("modal-trace");
    const grid = document.getElementById("trace-grid");
    modal.classList.remove("hidden");
    grid.innerHTML = "";

    state.traceCurrentStep = 1;
    let time = 12;
    document.getElementById("trace-step").textContent = "1 / 4";
    document.getElementById("trace-timer").textContent = `${time}с`;

    const nums = [1, 2, 3, 4].sort(() => Math.random() - 0.5);

    nums.forEach(n => {
        const btn = document.createElement("button");
        btn.className = "trace-node";
        btn.textContent = `УЗЕЛ РАЗВЕДКИ #${n}`;
        btn.addEventListener("click", () => {
            if (n === state.traceCurrentStep) {
                btn.classList.add("connected");
                btn.disabled = true;
                state.traceCurrentStep++;
                document.getElementById("trace-step").textContent = `${state.traceCurrentStep} / 4`;
                if (state.traceCurrentStep > 4) {
                    endEmergencyModal("modal-trace", true, 25, "Трассировка полностью завершена! Шпион изолирован.");
                }
            } else {
                btn.classList.add("error");
                setTimeout(() => btn.classList.remove("error"), 300);
            }
        });
        grid.appendChild(btn);
    });

    state.emergencyTimerId = setInterval(() => {
        time--;
        document.getElementById("trace-timer").textContent = `${time}с`;
        if (time <= 0) endEmergencyModal("modal-trace", false, 15, "Время вышло! Шпион скрылся в сети.");
    }, 1000);
}

function endEmergencyModal(modalId, won, repBonus, msg) {
    clearInterval(state.emergencyTimerId);
    document.getElementById(modalId).classList.add("hidden");

    if (won) {
        state.reputation += repBonus;
        showToast("Экстренная победа!", `${msg} +${repBonus} репутации`);
    } else {
        state.reputation = Math.max(0, state.reputation - 15);
        showToast("Угроза прорвалась!", `${msg} -15 очков репутации`);
    }

    state.caseIndex++;
    saveProgress();
    if (state.caseIndex < state.activeScenarios.length) {
        loadCase(state.caseIndex);
    } else {
        finishGame();
    }
}

function finishGame() {
    localStorage.removeItem(STORAGE_KEY);
    switchScreen("result");
    playAudioTheme("finish", true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const cfg = DIFFICULTY_CONFIG[state.difficulty];
    const modeLabel = state.gameMode === "marathon" ? "МАРАФОН 50" : "КЛАССИКА 05";
    const isCertificateEligible = state.difficulty === "medium" || state.difficulty === "hard";

    document.getElementById("cert-meta-left").textContent = `PROFДВИЖУХА // ${modeLabel}`;
    document.getElementById("cert-meta-right").textContent = `# ${state.callsign.toUpperCase()}_67`;
    document.getElementById("res-badge").textContent = `ИГРОК ${state.callsign.toUpperCase()}`;
    document.getElementById("res-rep").textContent = state.reputation;
    document.getElementById("res-correct").textContent = `${state.correctCount} из ${state.activeScenarios.length}`;
    document.getElementById("res-diff-label").textContent = `${cfg.name} (${modeLabel})`;

    // Точное соответствие даты моменту прохождения игры
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
    document.getElementById("cert-date").textContent = dateStr;

    let rank = "СТРАТЕГ БАЗЫ 67";
    let desc = "Ты превращаешь хаос кибератак в чёткую систему защиты. Твоя суперсила — хладнокровный анализ улик и точный расчёт.";

    if (state.reputation >= 210) {
        rank = "ЛЕГЕНДА ZOV-ЩИТА";
        desc = "Безупречная оборона контура! Ни один дипфейк, троян или DDoS-шторм не прошёл сквозь твой цифровой периметр.";
    } else if (state.reputation < 150) {
        rank = "ДОЗОРНЫЙ СЕТИ";
        desc = "Ты освоил базовые алгоритмы SOC-разведки и готов укреплять рубежи кибербезопасности на новых сменах.";
    }

    document.getElementById("res-rank").textContent = rank;
    document.getElementById("res-desc").textContent = desc;
    document.getElementById("cert-accomplish-line").textContent =
        `успешно завершил вахту «${cfg.name}» в режиме «${modeLabel}» и разблокировал цифровой профиль`;

    const totalCases = Math.max(1, state.activeScenarios.length);
    const logicScore = Math.min(10, Math.max(4, Math.round((state.correctCount / totalCases) * 10)));
    const accScore = Math.min(10, Math.max(4, Math.round(state.reputation / 22)));
    renderSegmentedBar("bar-logic", logicScore);
    renderSegmentedBar("bar-acc", accScore);
    renderSegmentedBar("bar-will", 10);

    const pdfBtn = document.getElementById("btn-download-pdf");
    const easyNotice = document.getElementById("cert-easy-notice");
    if (isCertificateEligible) {
        pdfBtn.classList.remove("hidden");
        easyNotice.classList.add("hidden");
    } else {
        pdfBtn.classList.add("hidden");
        easyNotice.classList.remove("hidden");
    }

    fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            callsign: state.callsign,
            difficulty: `${cfg.name} (${state.gameMode === "marathon" ? "Марафон" : "Классика"})`,
            reputation: state.reputation,
            correct_cases: state.correctCount
        })
    }).catch(() => {});
}

// СКАЧИВАНИЕ СЕРТИФИКАТА В .PDF В ФОНОВОМ РЕЖИМЕ БЕЗ ВСПЛЫВАЮЩИХ ОКОН
async function downloadCertificatePDF() {
    const exportWrap = document.getElementById("certificate-export-wrap");
    const pdfBtn = document.getElementById("btn-download-pdf");
    if (!exportWrap) return;

    const bgColor = state.isLightTheme ? "#f2f5eb" : "#090d0b";
    const safeCallsign = state.callsign.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, "") || "Operative";
    const filename = `Certificate_profDvizhuha_${safeCallsign}.pdf`;

    if (typeof html2pdf === "undefined") {
        window.print();
        return;
    }

    const originalText = pdfBtn.innerHTML;
    pdfBtn.disabled = true;
    pdfBtn.innerHTML = `<span>ГЕНЕРАЦИЯ PDF...</span><span class="btn-icon">⏳</span>`;

    const savedScrollY = window.scrollY;
    window.scrollTo(0, 0);

    const pdfStage = document.createElement("div");
    pdfStage.style.position = "fixed";
    pdfStage.style.top = "0";
    pdfStage.style.left = "0";
    pdfStage.style.width = "740px";
    pdfStage.style.padding = "28px 32px";
    pdfStage.style.backgroundColor = bgColor;
    pdfStage.style.zIndex = "99999";

    const clone = exportWrap.cloneNode(true);
    clone.style.margin = "0";
    clone.style.maxWidth = "100%";
    clone.style.width = "100%";

    const cloneCard = clone.querySelector(".cert-card");
    if (cloneCard) {
        cloneCard.style.backdropFilter = "none";
        cloneCard.style.webkitBackdropFilter = "none";
    }

    const cloneDot = clone.querySelector(".status-dot");
    if (cloneDot) {
        cloneDot.style.animation = "none";
        cloneDot.style.opacity = "1";
    }

    pdfStage.appendChild(clone);
    document.body.appendChild(pdfStage);

    await new Promise(resolve => setTimeout(resolve, 120));

    const stageW = pdfStage.offsetWidth;
    const stageH = pdfStage.offsetHeight;
    const pdfWidthMm = 210;
    const pdfHeightMm = Math.ceil((stageH / stageW) * pdfWidthMm) + 2;

    const opt = {
        margin: 0,
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: bgColor,
            width: stageW,
            height: stageH,
            windowWidth: stageW,
            windowHeight: stageH,
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
            logging: false
        },
        jsPDF: {
            unit: "mm",
            format: [pdfWidthMm, pdfHeightMm],
            orientation: "portrait"
        }
    };

    try {
        // Фоновая генерация и скачивание в обход открытия новых вкладок/диалогов печати
        const worker = html2pdf().set(opt).from(pdfStage);
        const pdfBlob = await worker.outputPdf('blob');
        
        const blobUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);

        showToast("Сертификат сохранён!", `Файл ${filename} загружен.`);
    } catch (e) {
        window.print();
    } finally {
        if (pdfStage.parentNode) {
            pdfStage.parentNode.removeChild(pdfStage);
        }
        window.scrollTo(0, savedScrollY);
        pdfBtn.disabled = false;
        pdfBtn.innerHTML = originalText;
    }
}

function renderSegmentedBar(containerId, filledCount) {
    const el = document.getElementById(containerId);
    el.innerHTML = "";
    for (let i = 0; i < 10; i++) {
        const span = document.createElement("span");
        span.className = `seg-unit ${i < filledCount ? "on" : ""}`;
        el.appendChild(span);
    }
}

function showToast(title, desc) {
    const toast = document.getElementById("toast-achievement");
    document.getElementById("toast-title").textContent = title;
    document.getElementById("toast-desc").textContent = desc;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 4200);
}