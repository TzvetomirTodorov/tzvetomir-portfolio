#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  scaffold-commits.sh — Reusable Git Commit Scaffolding Tool
# ═══════════════════════════════════════════════════════════════════
#  Author:  Tzvetomir Todorov
#  Purpose: Standardize git commits across all repositories.
#           Supports both quick single commits and scaffolded
#           multi-step commit sequences for structured deployments.
#
#  Usage:
#    ./scaffold-commits.sh "commit message"          # Quick commit + push
#    ./scaffold-commits.sh --scaffold                 # Run scaffolded commits
#    ./scaffold-commits.sh --dry-run                  # Preview without executing
#    ./scaffold-commits.sh --status                   # Show repo status
#    ./scaffold-commits.sh --help                     # Show usage info
#
#  Conventional Commits:
#    feat:     New feature
#    fix:      Bug fix
#    docs:     Documentation only
#    chore:    Build/tooling changes
#    refactor: Code restructure (no behavior change)
#    test:     Adding/fixing tests
#    style:    Formatting, whitespace
#    perf:     Performance improvement
#    ci:       CI/CD configuration
#
#  To customize for a specific repo, edit the scaffold_commits()
#  function below with your planned commit sequence.
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# ─── Helpers ──────────────────────────────────────────────────────
info()    { echo -e "${CYAN}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}❌${NC} $1"; }
header()  { echo -e "\n${MAGENTA}═══${NC} ${BOLD}$1${NC} ${MAGENTA}═══${NC}"; }
step()    { echo -e "${GREEN}→${NC}  ${DIM}[$1]${NC} $2"; }

DRY_RUN=false
PUSH_REMOTE=true
BRANCH=""

# ─── Git Helpers ──────────────────────────────────────────────────
ensure_git_repo() {
  if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    error "Not inside a git repository. Run from your project root."
    exit 1
  fi
}

get_branch() {
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
}

safe_commit() {
  # Usage: safe_commit "type: message" [files...]
  # If no files specified, stages everything that's changed.
  local msg="$1"
  shift
  local files=("$@")

  if [ ${#files[@]} -eq 0 ]; then
    # Stage all changes
    git add -A
  else
    # Stage specific files
    for f in "${files[@]}"; do
      if [ -e "$f" ]; then
        git add "$f"
      else
        warn "File not found: $f (skipping)"
      fi
    done
  fi

  # Only commit if there are staged changes
  if git diff --cached --quiet 2>/dev/null; then
    warn "No changes to commit for: ${msg}"
    return 0
  fi

  if [ "$DRY_RUN" = true ]; then
    step "DRY-RUN" "$msg"
    git diff --cached --stat
    git reset HEAD --quiet 2>/dev/null || true
  else
    git commit -m "$msg" --quiet
    success "$msg"
  fi
}

safe_push() {
  if [ "$PUSH_REMOTE" = true ] && [ "$DRY_RUN" = false ]; then
    header "Pushing to origin/${BRANCH}"
    if git remote get-url origin &>/dev/null; then
      git push origin "$BRANCH"
      success "Pushed to origin/${BRANCH}"
    else
      warn "No remote 'origin' configured. Skipping push."
      info "Add one with: git remote add origin <your-repo-url>"
    fi
  fi
}

show_status() {
  header "Repository Status"
  echo -e "${DIM}Branch:${NC}  $(git rev-parse --abbrev-ref HEAD)"
  echo -e "${DIM}Remote:${NC}  $(git remote get-url origin 2>/dev/null || echo 'none')"
  echo -e "${DIM}Commits:${NC} $(git rev-list --count HEAD 2>/dev/null || echo '0')"
  echo ""
  git status --short
  echo ""
  echo -e "${DIM}Recent commits:${NC}"
  git log --oneline -5 2>/dev/null || echo "  (no commits yet)"
}

show_help() {
  cat << 'HELP'

  ╔═══════════════════════════════════════════════════╗
  ║  scaffold-commits.sh — Git Commit Scaffolding     ║
  ╠═══════════════════════════════════════════════════╣
  ║                                                   ║
  ║  Quick commit:                                    ║
  ║    ./scaffold-commits.sh "feat: add login page"   ║
  ║                                                   ║
  ║  Scaffolded multi-step commits:                   ║
  ║    ./scaffold-commits.sh --scaffold               ║
  ║                                                   ║
  ║  Preview without executing:                       ║
  ║    ./scaffold-commits.sh --dry-run                ║
  ║                                                   ║
  ║  Show repo status:                                ║
  ║    ./scaffold-commits.sh --status                 ║
  ║                                                   ║
  ║  Skip push (local only):                          ║
  ║    ./scaffold-commits.sh --no-push "message"      ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝

  Conventional Commit Types:
    feat:      New feature
    fix:       Bug fix
    docs:      Documentation changes
    chore:     Build/tooling/config changes
    refactor:  Code restructure (no behavior change)
    test:      Adding or fixing tests
    style:     Formatting, whitespace
    perf:      Performance improvement
    ci:        CI/CD changes

HELP
}

# ═══════════════════════════════════════════════════════════════════
#  SCAFFOLD COMMITS — Customize this for your repo!
# ═══════════════════════════════════════════════════════════════════
#  This function defines the multi-step commit sequence.
#  Edit it for each project to match your deployment plan.
#
#  Each safe_commit call is one atomic commit:
#    safe_commit "type: message" [file1] [file2] ...
#
#  If no files are listed, ALL staged changes are committed.
#  Order matters — commits are applied sequentially.
# ═══════════════════════════════════════════════════════════════════

scaffold_commits() {
  header "Scaffolded Commit Sequence"
  info "Applying commits in order..."
  echo ""

  # ── Example scaffolding (replace with your actual commits) ──
  #
  # safe_commit "chore: add scaffold-commits.sh" \
  #   "scaffold-commits.sh"
  #
  # safe_commit "fix: resolve database connection issue" \
  #   "server/src/utils/db.js" \
  #   "server/src/index.js"
  #
  # safe_commit "feat: add user authentication" \
  #   "server/src/routes/auth.js" \
  #   "client/src/pages/Login.jsx"
  #
  # safe_commit "docs: update README with setup instructions" \
  #   "README.md"

  warn "No scaffolded commits defined yet."
  info "Edit the scaffold_commits() function in this script to define your commit sequence."
  info "Or use quick mode: ./scaffold-commits.sh \"type: your message\""
}

# ─── Main ─────────────────────────────────────────────────────────
main() {
  ensure_git_repo
  get_branch

  # Parse arguments
  case "${1:-}" in
    --help|-h)
      show_help
      exit 0
      ;;
    --status|-s)
      show_status
      exit 0
      ;;
    --dry-run)
      DRY_RUN=true
      header "DRY RUN MODE — No changes will be committed"
      scaffold_commits
      exit 0
      ;;
    --no-push)
      PUSH_REMOTE=false
      shift
      ;;&  # Fall through to check remaining args
    --scaffold)
      scaffold_commits
      safe_push
      echo ""
      success "All scaffolded commits applied! 🐾"
      show_status
      exit 0
      ;;
    "")
      show_help
      exit 0
      ;;
    --*)
      # Handle --no-push followed by a message
      if [ "${1:-}" = "--no-push" ] && [ -n "${2:-}" ]; then
        PUSH_REMOTE=false
        safe_commit "$2"
        exit 0
      fi
      error "Unknown option: $1"
      show_help
      exit 1
      ;;
    *)
      # Quick commit mode: ./scaffold-commits.sh "type: message"
      header "Quick Commit"
      safe_commit "$1"
      safe_push
      echo ""
      success "Done! 🐾"
      exit 0
      ;;
  esac
}

main "$@"
