# Contributing to Genshin Abyss Studio

Thank you for contributing to Genshin Abyss Studio! This document outlines our development workflow, pull request standards, and architectural conventions.

---

## 1. Development Workflow & Branching Strategy

To keep the application stable and test-backed, we follow small, focused Pull Requests:

1. **One Branch = One Coherent Outcome**: Avoid monolithic branches.
2. **Branch Naming Conventions**:
   - `chore/...`: Infrastructure, dependency pinning, documentation, CI.
   - `fix/...`: Bug fixes, security patches, pipeline corrections.
   - `refactor/...`: Modularization, typed domain models, code organization without behavioral change.
   - `feat/...`: New creator-facing features (save/load, undo/redo, UI controls).
   - `test/...`: Test harness additions and synthetic fixtures.
3. **Branch from Default**: Ensure your branch starts from the latest `main` commit.
4. **Draft Pull Requests**: Open a Draft PR early to track CI test runs and diff progression.

---

## 2. Local Environment Setup

### Prerequisites
- Python 3.10+ (tested on Windows 10/11)
- Git

### Installation
```bash
git clone https://github.com/nzubechukwudavid/genshin-abyss-studio.git
cd genshin-abyss-studio
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Running Locally
```bash
python app.py
```
Open your browser at `http://127.0.0.1:7860`.

---

## 3. Running Automated Tests

Run the test suite using pytest:
```bash
python -m pytest tests/ -v
```

Before submitting a PR:
- Ensure all tests pass.
- Verify `git status` remains clean without untracked cache binaries.
- Ensure 1080p thumbnail export retains full visual quality.

---

## 4. Fan-Work & Asset Policy

Genshin Abyss Studio is an independent fan-created workstation. Genshin Impact game assets, character art, and logos belong to miHoYo / Cognosphere Pte. Ltd. Contributions must not contain paid or private third-party assets.
