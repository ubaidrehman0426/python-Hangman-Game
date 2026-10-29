
import random
from flask import Flask, render_template, request, jsonify, session

app = Flask(__name__)
app.secret_key = "replace-with-a-secure-random-secret"

WORDS = [
    "python", "javascript", "kotlin", "ruby", "swift", "algorithm",
    "compiler", "database", "encryption", "firewall", "hardware",
    "internet", "java", "kernel", "malware", "network", "object",
    "protocol", "query", "router", "security", "token", "url",
    "virtual", "wireless", "xml", "yaml", "zip", "abstract", "binary",
    "cache", "developer", "ethernet", "framework", "gateway",
    "hexadecimal", "iteration", "juxtapose", "keystroke", "lambda",
    "metadata", "node"
]

MAX_ATTEMPTS = 6


def new_game():
    session["word"] = random.choice(WORDS)
    session["guessed"] = []
    session["attempts"] = MAX_ATTEMPTS
    session["status"] = "playing"


def get_game_state():
    word = session["word"]
    guessed = session["guessed"]
    attempts = session["attempts"]
    status = session["status"]

    display = [
        letter if letter in guessed else "_"
        for letter in word
    ]

    result = {
        "display": display,
        "guessed": guessed,
        "attempts": attempts,
        "max_attempts": MAX_ATTEMPTS,
        "wrong_guesses": MAX_ATTEMPTS - attempts,
        "status": status,
        "word_length": len(word),
    }

    if status in ("won", "lost"):
        result["word"] = word

    return result


@app.route("/")
def index():
    if "word" not in session:
        new_game()
    return render_template("index.html")


@app.route("/api/state")
def game_state():
    if "word" not in session:
        new_game()
    return jsonify(get_game_state())


@app.route("/api/guess", methods=["POST"])
def guess_letter():
    if "word" not in session:
        new_game()

    data = request.get_json(silent=True) or {}
    letter = str(data.get("letter", "")).lower().strip()

    if session["status"] != "playing":
        return jsonify({
            "error": "The game has ended. Start a new game to play again."
        }), 400

    if len(letter) != 1 or not letter.isascii() or not letter.isalpha():
        return jsonify({"error": "Please enter a single letter (A-Z)."}), 400

    guessed = session["guessed"]

    if letter in guessed:
        return jsonify({
            "error": "You have already guessed that letter."
        }), 400

    guessed.append(letter)
    session["guessed"] = guessed

    word = session["word"]

    if letter not in word:
        session["attempts"] -= 1

    display = [
        char if char in guessed else "_"
        for char in word
    ]

    if "_" not in display:
        session["status"] = "won"
    elif session["attempts"] == 0:
        session["status"] = "lost"

    session.modified = True

    return jsonify(get_game_state())


@app.route("/api/new-game", methods=["POST"])
def restart_game():
    new_game()
    return jsonify(get_game_state())


if __name__ == "__main__":
    app.run(debug=True)
