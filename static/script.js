
const $ = (selector) => document.querySelector(selector);

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
let gameState = null;
let busy = false;

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Unable to complete the request.");
    }

    return data;
}

function showMessage(text, type = "success") {
    const message = $("#message");
    message.textContent = text;
    message.className = `message visible ${type}`;
}

function hideMessage() {
    $("#message").className = "message";
    $("#message").textContent = "";
}

function renderKeyboard() {
    const keyboard = $("#keyboard");
    keyboard.replaceChildren();

    ALPHABET.forEach((letter) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "key";
        button.textContent = letter;
        button.setAttribute("aria-label", `Guess ${letter}`);

        const guessed = gameState.guessed.includes(letter.toLowerCase());

        if (guessed) {
            const correct = gameState.display.includes(letter.toLowerCase());
            button.classList.add(correct ? "correct" : "incorrect");
        }

        button.disabled = guessed || gameState.status !== "playing" || busy;

        button.addEventListener("click", () => guessLetter(letter));

        keyboard.appendChild(button);
    });
}

function renderWord() {
    const container = $("#wordDisplay");
    container.replaceChildren();

    const display = gameState.display.map((letter, index) => {
        if (gameState.status === "lost") {
            return gameState.word[index];
        }
        return letter;
    });

    display.forEach((letter) => {
        const slot = document.createElement("span");
        slot.className = "letter-slot";

        if (letter !== "_") {
            slot.classList.add("revealed");
            slot.textContent = letter.toUpperCase();
        } else {
            slot.textContent = "";
            slot.setAttribute("aria-label", "Hidden letter");
        }

        container.appendChild(slot);
    });

    const revealed = gameState.status === "lost"
    ? gameState.word.length
    : gameState.display.filter((letter) => letter !== "_").length;

    $("#wordProgress").textContent =
    `${revealed} / ${gameState.word_length} letters`;

    container.setAttribute(
        "aria-label",
        `Word: ${display.map((letter) => letter === "_" ? "blank" : letter).join(" ")}`
    );
}

function renderDrawing() {
    const wrong = gameState.wrong_guesses;

    document.querySelectorAll("[data-part]").forEach((part) => {
        const partNumber = Number(part.dataset.part);
        part.classList.toggle("visible", partNumber <= wrong);
    });

    const dots = $("#mistakeDots");
    dots.replaceChildren();

    for (let i = 0; i < gameState.max_attempts; i++) {
        const dot = document.createElement("span");
        dot.className = "mistake-dot";

        if (i < wrong) {
            dot.classList.add("used");
        }

        dots.appendChild(dot);
    }

    $("#attemptBadge").textContent =
    `${gameState.attempts} ${gameState.attempts === 1 ? "attempt" : "attempts"} left`;

    $("#attemptBadge").classList.toggle("safe", gameState.attempts > 3);

    const captions = [
        "Game over! Better luck next time.",
        "Careful! No attempts left.",
        "One more mistake could end the game.",
        "Stay focused. You're getting closer.",
        "Keep going. You can do this!",
        "Good start. Think of common letters.",
        "You're doing great. Keep going!"
    ];

    $("#drawingCaption").textContent = captions[wrong];
}

function renderGame() {
    if (!gameState) return;

    renderKeyboard();
    renderWord();
    renderDrawing();

    if (gameState.status === "won") {
        showMessage(
            `🎉 Congratulations! You guessed "${gameState.word.toUpperCase()}" correctly!`,
                    "success"
        );
    } else if (gameState.status === "lost") {
        showMessage(
            `Game over! The secret word was "${gameState.word.toUpperCase()}". Try again!`,
                    "error"
        );
    } else {
        hideMessage();
    }
}

async function guessLetter(letter) {
    if (busy || !gameState || gameState.status !== "playing") return;

    const normalized = letter.toLowerCase();

    if (gameState.guessed.includes(normalized)) {
        showMessage(`You already guessed "${letter.toUpperCase()}".`, "error");
        return;
    }

    busy = true;
    renderKeyboard();

    try {
        gameState = await api("/api/guess", {
            method: "POST",
            body: JSON.stringify({ letter: normalized })
        });

        renderGame();
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        busy = false;
        renderKeyboard();
    }
}

async function startNewGame() {
    if (busy) return;

    busy = true;

    try {
        gameState = await api("/api/new-game", {
            method: "POST",
            body: JSON.stringify({})
        });

        renderGame();
        showMessage("A new word is ready. Good luck!", "success");
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        busy = false;
        renderKeyboard();
    }
}

document.addEventListener("keydown", (event) => {
    if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.repeat ||
        event.target.matches("input, textarea, select, [contenteditable='true']")
    ) {
        return;
    }

    if (/^[a-z]$/i.test(event.key)) {
        guessLetter(event.key);
    }
});

$("#newGameBtn").addEventListener("click", startNewGame);

async function initializeGame() {
    try {
        gameState = await api("/api/state");
        renderGame();
    } catch (error) {
        showMessage(
            "Could not load the game. Please refresh the page.",
            "error"
        );
    }
}

initializeGame();
