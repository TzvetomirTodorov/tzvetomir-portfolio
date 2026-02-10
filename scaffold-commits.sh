#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Smart Scaffolding Script v2.8
# ═══════════════════════════════════════════════════════════════════════════════
#
# Universal deployment script — drop into ANY git repo and run it.
# Auto-detects GitHub user, repo name, and remote URL from git config.
#
# This script analyzes WHAT changed and creates meaningful, verbose commits
# that describe the actual features and changes.
#
# v2.8 - UNIVERSAL: auto-detects repo info from git remote URL. No more
#         hardcoded config — same script works in every project.
# v2.7 - PERFORMANCE: replaced O(n) file-by-file comparison loop with single
#         git diff command. Dramatically faster on Windows/MINGW64 where process
#         spawning is slow. Also excludes known ghost files (.env.backup, old scripts).
# v2.6 - Branch-aware: auto-detects current branch, compares/pushes correctly
# v2.5 - Fixed catastrophic git rm bug, safe staging area reset
# v2.4 - Fixed commit staging bug (files now staged per-feature, not all at once)
# v2.3 - Fixed remote fetch after fresh git init (proper refspec creation)
# v2.2 - Compares against remote to detect ONLY real changes (not all files)
# v2.1 - Auto-renames 'master' branch to 'main' (industry best practice)
#
# Usage:
#   chmod +x scaffold-commits.sh
#   ./scaffold-commits.sh
#
# ═══════════════════════════════════════════════════════════════════════════════

# ==================== AUTO-DETECT CONFIGURATION ====================
# Parse GitHub user and repo name from the git remote URL.
# Supports both formats:
#   HTTPS:  https://github.com/TzvetomirTodorov/PawsTrack.git
#   SSH:    git@github.com:TzvetomirTodorov/PawsTrack.git

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

if [ -n "$REMOTE_URL" ]; then
    # Strip trailing .git if present
    CLEAN_URL="${REMOTE_URL%.git}"
    
    # Extract user/repo from either HTTPS or SSH format
    if echo "$CLEAN_URL" | grep -q "github.com"; then
        # HTTPS: https://github.com/USER/REPO → split on github.com/
        # SSH:   git@github.com:USER/REPO     → split on github.com:
        USER_REPO=$(echo "$CLEAN_URL" | sed -E 's|.*github\.com[:/]||')
        GITHUB_USER=$(echo "$USER_REPO" | cut -d'/' -f1)
        REPO_NAME=$(echo "$USER_REPO" | cut -d'/' -f2)
    else
        # Non-GitHub remote — extract what we can from the URL
        REPO_NAME=$(basename "$CLEAN_URL")
        GITHUB_USER=$(basename "$(dirname "$CLEAN_URL")")
    fi
    
    GITHUB_REPO="$REMOTE_URL"
else
    # No remote yet — fall back to folder name
    REPO_NAME=$(basename "$(pwd)")
    GITHUB_USER="unknown"
    GITHUB_REPO=""
fi

DEFAULT_BRANCH="main"

# Temp directory
TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'scaffold')
trap "rm -rf $TEMP_DIR" EXIT

# ==================== COLORS ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m'

# ==================== HELPER FUNCTIONS ====================
print_header() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  🐾 $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }
print_file() { echo -e "  ${GRAY}→${NC} $1"; }

# ==================== SMART FEATURE DETECTION ====================
# This function looks at file names and paths to determine the ACTUAL feature

detect_feature() {
    local file="$1"
    local basename=$(basename "$file")
    local dirname=$(dirname "$file")
    
    # ===== SPECIFIC FEATURE DETECTION (most specific first) =====
    
    # Email/Resend
    case "$file" in
        *email.js|*email.ts|*resend*|*smtp*|*mailer*)
            echo "email-service"
            return ;;
    esac
    
    # Admin Access/Coordinator Requests
    case "$file" in
        *AdminRequests*|*adminAccess*|*admin-access*|*coordinator*)
            echo "admin-access"
            return ;;
    esac
    
    # Authentication
    case "$file" in
        *[Aa]uth[A-Z]*|*[Aa]uth.js*|*[Ll]ogin*|*[Rr]egister*|*[Vv]erify*|*[Pp]assword*|*[Ss]ession*)
            echo "auth"
            return ;;
    esac
    
    # User Management
    case "$file" in
        *[Uu]sers.jsx|*[Uu]ser[Cc]ontroller*|*[Uu]ser[Rr]outes*|*[Pp]rofile*)
            echo "users"
            return ;;
    esac
    
    # Animals
    case "$file" in
        *[Aa]nimal*)
            echo "animals"
            return ;;
    esac
    
    # Clinics
    case "$file" in
        *[Cc]linic*)
            echo "clinics"
            return ;;
    esac
    
    # Shifts/Scheduling
    case "$file" in
        *[Ss]hift*|*[Ss]chedule*|*[Aa]ssignment*)
            echo "shifts"
            return ;;
    esac
    
    # Notifications
    case "$file" in
        *[Nn]otification*)
            echo "notifications"
            return ;;
    esac
    
    # Dashboard
    case "$file" in
        *[Dd]ashboard*)
            echo "dashboard"
            return ;;
    esac
    
    # Onboarding
    case "$file" in
        *[Oo]nboarding*|*[Ww]elcome*|*[Tt]our*)
            echo "onboarding"
            return ;;
    esac
    
    # Rate Limiting (specific security feature)
    case "$file" in
        *[Rr]ate[Ll]imit*)
            echo "rate-limiting"
            return ;;
    esac
    
    # ===== CATEGORY-BASED DETECTION (fallback) =====
    
    # Migrations
    case "$file" in
        */migrations/*.js|*/migrations/*.sql)
            echo "database"
            return ;;
    esac
    
    # Documentation
    case "$file" in
        *.md|docs/*|README*|CHANGELOG*|LICENSE*|*.txt)
            echo "docs"
            return ;;
    esac
    
    # Tests
    case "$file" in
        *.test.js|*.spec.js|*/tests/*|*/__tests__/*)
            echo "tests"
            return ;;
    esac
    
    # Styles
    case "$file" in
        *.css|*.scss|*tailwind*|*style*)
            echo "styles"
            return ;;
    esac
    
    # Configuration
    case "$file" in
        */config/*|*.config.js|*.config.ts|.env*|railway.json|docker*|Dockerfile*)
            echo "config"
            return ;;
    esac
    
    # Dependencies
    case "$file" in
        package.json|package-lock.json|*/package.json)
            echo "dependencies"
            return ;;
    esac
    
    # Scripts
    case "$file" in
        *.sh|scripts/*)
            echo "scripts"
            return ;;
    esac
    
    # CI/CD
    case "$file" in
        .github/*|*.yml|*.yaml)
            echo "ci-cd"
            return ;;
    esac
    
    # Assets
    case "$file" in
        */assets/*|*/images/*|*/public/*|*.svg|*.png|*.jpg)
            echo "assets"
            return ;;
    esac
    
    # API/Services
    case "$file" in
        */services/*.js|*/api.js)
            echo "api-client"
            return ;;
    esac
    
    # Controllers (generic backend)
    case "$file" in
        */controllers/*)
            echo "backend-api"
            return ;;
    esac
    
    # Routes (generic backend)
    case "$file" in
        */routes/*)
            echo "backend-routes"
            return ;;
    esac
    
    # Middleware
    case "$file" in
        */middleware/*)
            echo "middleware"
            return ;;
    esac
    
    # App.jsx / Main entry
    case "$file" in
        */App.jsx|*/App.tsx|*/main.jsx|*/index.jsx)
            echo "app-core"
            return ;;
    esac
    
    # Pages index
    case "$file" in
        */pages/index.js|*/pages/index.ts)
            echo "page-exports"
            return ;;
    esac
    
    # Pages (generic frontend)
    case "$file" in
        */pages/*.jsx|*/pages/*.tsx)
            echo "ui-pages"
            return ;;
    esac
    
    # Layout components
    case "$file" in
        */layout/*|*Layout*)
            echo "layout"
            return ;;
    esac
    
    # Components (generic frontend)
    case "$file" in
        */components/*.jsx|*/components/*.tsx)
            echo "ui-components"
            return ;;
    esac
    
    # State management
    case "$file" in
        */context/*|*Store*|*store*)
            echo "state"
            return ;;
    esac
    
    # Utilities
    case "$file" in
        */utils/*|*/helpers/*)
            echo "utilities"
            return ;;
    esac
    
    # Default
    echo "misc"
}

# ==================== COMMIT MESSAGE GENERATION ====================
# Generate verbose, meaningful commit messages based on feature

get_commit_info() {
    local feature="$1"
    local files="$2"
    
    case "$feature" in
        "email-service")
            echo "feat(email): integrate Resend email service with pawstrack.app domain"
            echo ""
            echo "Replace Gmail SMTP with Resend for reliable email delivery."
            echo "- Add Resend SDK integration with fallback to nodemailer"
            echo "- Configure professional sender: noreply@pawstrack.app"
            echo "- Improve email deliverability with verified domain"
            echo "- Support all email templates (verification, password reset, etc.)"
            ;;
        "admin-access")
            echo "feat(admin): implement coordinator access request system"
            echo ""
            echo "Add complete workflow for requesting and managing coordinator access."
            echo "- Add AdminRequests page for admins to review pending requests"
            echo "- Add coordinator request checkbox option at user registration"
            echo "- Add request status display in Profile page for volunteers"
            echo "- Include approve/deny/revoke functionality with audit logging"
            echo "- Notify admins when new requests are submitted"
            ;;
        "auth")
            echo "feat(auth): enhance authentication and security"
            echo ""
            echo "Improve authentication with additional security features."
            echo "- Update login/register flows"
            echo "- Enhance token management and session handling"
            echo "- Improve password security and validation"
            ;;
        "users")
            echo "feat(users): update user management and profiles"
            echo ""
            echo "Enhance user-related functionality."
            echo "- Update profile management features"
            echo "- Improve avatar handling"
            echo "- Enhance user data handling"
            ;;
        "animals")
            echo "feat(animals): update animal management system"
            echo ""
            echo "Improve animal tracking and care features."
            echo "- Enhance animal profiles and photos"
            echo "- Update notes and medical records"
            echo "- Improve search and filtering"
            ;;
        "clinics")
            echo "feat(clinics): update clinic management"
            echo ""
            echo "Enhance clinic features and administration."
            echo "- Update clinic profiles and photos"
            echo "- Improve statistics and reporting"
            echo "- Enhance user-clinic associations"
            ;;
        "shifts")
            echo "feat(shifts): update shift scheduling system"
            echo ""
            echo "Improve volunteer scheduling features."
            echo "- Update shift creation and management"
            echo "- Enhance assignment workflows"
            echo "- Improve calendar views"
            ;;
        "notifications")
            echo "feat(notifications): update notification system"
            echo ""
            echo "Enhance in-app notifications and alerts."
            echo "- Improve notification delivery"
            echo "- Update notification UI components"
            echo "- Add new notification types"
            ;;
        "dashboard")
            echo "feat(dashboard): update dashboard views"
            echo ""
            echo "Improve dashboard layout and data display."
            echo "- Update statistics cards"
            echo "- Enhance data visualization"
            echo "- Improve responsive design"
            ;;
        "onboarding")
            echo "feat(onboarding): update user onboarding experience"
            echo ""
            echo "Enhance new user experience."
            echo "- Update guided tour steps"
            echo "- Improve welcome flow"
            echo "- Add helpful tooltips"
            ;;
        "rate-limiting")
            echo "feat(security): implement API rate limiting"
            echo ""
            echo "Add rate limiting to prevent abuse."
            echo "- Configure endpoint-specific limits"
            echo "- Add progressive penalties"
            echo "- Include bypass for authenticated requests"
            ;;
        "database")
            echo "feat(db): update database schema and migrations"
            echo ""
            echo "Add/modify database structure for new features."
            echo "- Create new tables and columns"
            echo "- Update indexes for performance"
            echo "- Ensure data integrity"
            ;;
        "docs")
            echo "docs: update project documentation"
            echo ""
            echo "Improve documentation and guides."
            echo "- Update README and setup instructions"
            echo "- Add API documentation"
            echo "- Improve code comments"
            ;;
        "tests")
            echo "test: update test suite"
            echo ""
            echo "Add or improve automated tests."
            echo "- Add unit tests"
            echo "- Update integration tests"
            echo "- Improve test coverage"
            ;;
        "styles")
            echo "style: update styling and visual design"
            echo ""
            echo "Improve visual appearance and CSS."
            echo "- Update color schemes"
            echo "- Improve responsive layouts"
            echo "- Add animations and transitions"
            ;;
        "config")
            echo "chore(config): update project configuration"
            echo ""
            echo "Modify environment and build settings."
            echo "- Update environment variables"
            echo "- Modify build configuration"
            echo "- Update deployment settings"
            ;;
        "dependencies")
            echo "chore(deps): update project dependencies"
            echo ""
            echo "Add, update, or remove npm packages."
            echo "- Update package versions"
            echo "- Add new required packages"
            echo "- Remove unused dependencies"
            ;;
        "scripts")
            echo "chore(scripts): update build and deployment scripts"
            echo ""
            echo "Improve development workflow scripts."
            echo "- Update scaffolding script"
            echo "- Improve deployment automation"
            echo "- Add utility scripts"
            ;;
        "ci-cd")
            echo "ci: update CI/CD pipeline"
            echo ""
            echo "Improve automated workflows."
            echo "- Update GitHub Actions"
            echo "- Improve build process"
            echo "- Enhance deployment automation"
            ;;
        "assets")
            echo "chore(assets): update static assets"
            echo ""
            echo "Add or modify images and icons."
            echo "- Update logos and branding"
            echo "- Add new icons"
            echo "- Optimize image sizes"
            ;;
        "api-client")
            echo "feat(api): update frontend API services"
            echo ""
            echo "Improve API client communication."
            echo "- Add new API methods"
            echo "- Update request handling"
            echo "- Improve error handling"
            ;;
        "backend-api")
            echo "feat(api): update backend API controllers"
            echo ""
            echo "Improve server-side API endpoints."
            echo "- Add new endpoints"
            echo "- Update request validation"
            echo "- Improve response formatting"
            ;;
        "backend-routes")
            echo "feat(routes): update API route definitions"
            echo ""
            echo "Modify Express route configuration."
            echo "- Add new routes"
            echo "- Update route middleware"
            echo "- Improve route organization"
            ;;
        "middleware")
            echo "feat(middleware): update server middleware"
            echo ""
            echo "Improve request processing."
            echo "- Update authentication middleware"
            echo "- Improve error handling"
            echo "- Add request logging"
            ;;
        "app-core")
            echo "feat(app): update application core"
            echo ""
            echo "Modify main application structure."
            echo "- Update routing configuration"
            echo "- Improve app initialization"
            echo "- Add new features to core"
            ;;
        "page-exports")
            echo "chore(pages): update page exports"
            echo ""
            echo "Modify page module exports."
            ;;
        "ui-pages")
            echo "feat(ui): update page components"
            echo ""
            echo "Improve frontend page layouts."
            echo "- Update page structure"
            echo "- Improve user interactions"
            echo "- Enhance responsive design"
            ;;
        "layout")
            echo "feat(layout): update layout components"
            echo ""
            echo "Improve application layout."
            echo "- Update navigation"
            echo "- Improve sidebar/header"
            echo "- Enhance responsive behavior"
            ;;
        "ui-components")
            echo "feat(ui): update reusable components"
            echo ""
            echo "Improve shared UI components."
            echo "- Update component props"
            echo "- Improve accessibility"
            echo "- Enhance visual consistency"
            ;;
        "state")
            echo "feat(state): update state management"
            echo ""
            echo "Improve React context and stores."
            echo "- Update state logic"
            echo "- Improve data flow"
            echo "- Enhance performance"
            ;;
        "utilities")
            echo "refactor(utils): update utility functions"
            echo ""
            echo "Improve helper functions."
            echo "- Add new utilities"
            echo "- Refactor existing helpers"
            echo "- Improve type safety"
            ;;
        *)
            echo "chore: miscellaneous updates"
            echo ""
            echo "General maintenance and improvements."
            ;;
    esac
}

# Get just the commit title (first line)
get_commit_title() {
    get_commit_info "$1" | head -1
}

# Get the full commit body
get_commit_body() {
    get_commit_info "$1" | tail -n +2
}

# ==================== MAIN SCRIPT ====================

print_header "Smart Scaffolding Script v2.8"

# Get version from package.json (try multiple locations)
VERSION=$(grep -o '"version": "[^"]*"' server/package.json 2>/dev/null | head -1 | cut -d'"' -f4)
[ -z "$VERSION" ] && VERSION=$(grep -o '"version": "[^"]*"' package.json 2>/dev/null | head -1 | cut -d'"' -f4)
VERSION=${VERSION:-"unknown"}
echo -e "  Repository:  ${CYAN}${GITHUB_USER}/${REPO_NAME}${NC}"
echo -e "  Remote:      ${CYAN}${GITHUB_REPO:-"(none)"}${NC}"
echo -e "  Version:     ${CYAN}v${VERSION}${NC}"
echo ""

# ==================== STEP 1: GIT SETUP ====================
print_step "Step 1: Git Repository Setup"

if [ -d ".git" ]; then
    print_success "Git repository exists"
    
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "none")
    if [ "$CURRENT_REMOTE" = "none" ]; then
        print_warning "No remote 'origin' configured"
        echo -e "  ${GRAY}Add one with: git remote add origin <url>${NC}"
        echo ""
        read -p "Continue without remote? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        print_success "Remote: $CURRENT_REMOTE"
    fi
else
    print_info "Initializing git repository..."
    git init
    if [ -n "$GITHUB_REPO" ]; then
        git remote add origin "$GITHUB_REPO"
        print_success "Git initialized with remote: $GITHUB_REPO"
    else
        print_success "Git initialized (no remote configured)"
    fi
fi

# ==================== BRANCH DETECTION (Branch-Aware) ====================
# Detect current branch - supports main, feature branches, etc.
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

# Only rename master→main (industry best practice)
if [ "$CURRENT_BRANCH" = "master" ]; then
    print_info "Renaming branch 'master' → 'main' (best practice)..."
    git branch -m master main
    CURRENT_BRANCH="main"
    print_success "Branch renamed to 'main'"
elif [ -z "$CURRENT_BRANCH" ]; then
    # No commits yet, set default branch name
    git config init.defaultBranch main 2>/dev/null || true
    CURRENT_BRANCH="main"
fi

# Set the working branch (used for fetch/compare/push)
WORKING_BRANCH="$CURRENT_BRANCH"
if [ -z "$WORKING_BRANCH" ]; then
    WORKING_BRANCH="main"
fi

# Display branch info
if [ "$WORKING_BRANCH" = "main" ]; then
    print_success "Working on branch: $WORKING_BRANCH"
else
    print_info "Working on feature branch: $WORKING_BRANCH"
    echo -e "  ${GRAY}(Will compare against origin/$WORKING_BRANCH if exists, otherwise origin/main)${NC}"
fi

# ==================== STEP 2: FETCH REMOTE & DETECT REAL CHANGES ====================
print_step "Step 2: Detecting Real Changes (vs Remote)"

# Fetch remote to get current state (without checkout)
print_info "Fetching remote state..."

# Try fetch strategies
FETCH_SUCCESS="no"
COMPARE_BRANCH="$WORKING_BRANCH"

# Strategy 1: Fetch the working branch with explicit refspec
if git fetch origin "$WORKING_BRANCH:refs/remotes/origin/$WORKING_BRANCH" 2>/dev/null; then
    FETCH_SUCCESS="yes"
    print_success "Fetched origin/$WORKING_BRANCH"
fi

# Strategy 2: Fetch all refs (if strategy 1 didn't work)
if [ "$FETCH_SUCCESS" = "no" ]; then
    if git fetch origin 2>/dev/null; then
        FETCH_SUCCESS="yes"
        print_success "Fetched remote refs"
    fi
fi

# Strategy 3: If on feature branch and it doesn't exist on remote, try main
if [ "$FETCH_SUCCESS" = "no" ] && [ "$WORKING_BRANCH" != "main" ]; then
    print_info "Feature branch not on remote, trying main..."
    if git fetch origin main:refs/remotes/origin/main 2>/dev/null; then
        FETCH_SUCCESS="yes"
        COMPARE_BRANCH="main"
        print_success "Fetched origin/main (for comparison)"
    fi
fi

# Determine which remote branch to compare against
REMOTE_REF=""
if git rev-parse --verify "origin/$WORKING_BRANCH" >/dev/null 2>&1; then
    REMOTE_REF="origin/$WORKING_BRANCH"
    COMPARE_BRANCH="$WORKING_BRANCH"
elif git rev-parse --verify "origin/main" >/dev/null 2>&1; then
    REMOTE_REF="origin/main"
    COMPARE_BRANCH="main"
fi

# Check if we have a remote to compare against
if [ -n "$REMOTE_REF" ]; then
    REMOTE_EXISTS="yes"
    if [ "$COMPARE_BRANCH" = "$WORKING_BRANCH" ]; then
        print_success "Comparing against $REMOTE_REF"
    else
        print_info "Comparing against $REMOTE_REF (feature branch is new)"
    fi
else
    REMOTE_EXISTS="no"
    print_warning "No remote history found - treating as initial commit"
fi

if [ "$REMOTE_EXISTS" = "yes" ]; then
    
    # ── Fast comparison using git diff (v2.7 optimization) ──────────────────
    # Previous versions looped over every file individually, spawning 2 git
    # processes per file (git ls-tree + git hash-object).  On a 200-file project
    # that's ~400 process spawns, which is painfully slow on Windows/MINGW64.
    #
    # Strategy: stage everything → compare staging area vs remote → unstage.
    # git diff --cached does the ENTIRE comparison in a single process using
    # git's internal tree-walking code — typically completes in <1 second.
    # ────────────────────────────────────────────────────────────────────────────
    
    # Stage everything so git diff --cached can see ALL files (including new ones)
    git add -A 2>/dev/null
    
    # Compare staging area against remote — catches modified, added, and renamed files
    CHANGED_FILES=$(git diff --name-only --cached --diff-filter=ACMRT "$REMOTE_REF" -- 2>/dev/null || true)
    
    # Filter out noise (build artifacts, env files, known ghost files)
    CHANGED_FILES=$(echo "$CHANGED_FILES" \
        | grep -v '^$' \
        | grep -v 'node_modules/' \
        | grep -v 'client/dist/' \
        | grep -v '\.log$' \
        | grep -v '^\.env$' \
        | grep -v '\.env\.backup$' \
        | grep -v 'step3-lockdown-deploy\.sh$' \
        | sort -u)
    
    # Unstage everything so we can re-stage per-feature in Step 4
    if git rev-parse HEAD >/dev/null 2>&1; then
        git reset HEAD >/dev/null 2>&1 || true
    else
        # Fresh repo with no commits — remove from index manually
        git rm --cached -r . >/dev/null 2>&1 || true
    fi
else
    print_warning "No remote history found - treating as initial commit"
    # DON'T stage anything here! Just list all files.
    CHANGED_FILES=$(find . -type f \
        ! -path './.git/*' \
        ! -path './node_modules/*' \
        ! -path './client/node_modules/*' \
        ! -path './server/node_modules/*' \
        ! -path './client/dist/*' \
        ! -name '*.log' \
        ! -name '.env' \
        2>/dev/null | sed 's|^\./||' | sort)
fi

if [ -z "$CHANGED_FILES" ]; then
    print_success "Repository is up to date with remote!"
    echo ""
    read -p "Create empty commit for redeploy? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A 2>/dev/null || true
        git commit --allow-empty -m "chore: trigger redeploy

Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
        print_success "Empty commit created"
        read -p "Push now? (y/n) " -n 1 -r
        echo ""
        [[ $REPLY =~ ^[Yy]$ ]] && git push origin "$DEFAULT_BRANCH" --force
    fi
    exit 0
fi

FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
print_info "Found ${FILE_COUNT} files changed vs remote"
echo ""

# DON'T stage files here - we'll stage them per-feature in Step 4

# Categorize files by FEATURE (not just file type)
for file in $CHANGED_FILES; do
    feature=$(detect_feature "$file")
    echo "$file" >> "$TEMP_DIR/$feature.files"
done

FEATURES=$(ls "$TEMP_DIR"/*.files 2>/dev/null | xargs -n1 basename 2>/dev/null | sed 's/.files$//' | sort)

# Show detected features
echo -e "${WHITE}Detected Features:${NC}"
echo ""
for feature in $FEATURES; do
    file_count=$(wc -l < "$TEMP_DIR/$feature.files" | tr -d ' ')
    title=$(get_commit_title "$feature")
    echo -e "  ${GREEN}●${NC} ${CYAN}$feature${NC} ($file_count files)"
    echo -e "    ${WHITE}→ $title${NC}"
done
echo ""

# ==================== STEP 3: PREVIEW COMMITS ====================
print_step "Step 3: Commit Plan"

# Order features logically
FEATURE_ORDER="email-service admin-access auth users animals clinics shifts notifications dashboard onboarding rate-limiting database backend-api backend-routes middleware api-client app-core layout ui-pages page-exports ui-components state utilities tests docs styles config dependencies scripts ci-cd assets misc"

echo -e "${WHITE}Commits to create:${NC}"
echo ""

COMMIT_NUM=0
COMMIT_ORDER=""

for feature in $FEATURE_ORDER; do
    if [ -f "$TEMP_DIR/$feature.files" ]; then
        COMMIT_NUM=$((COMMIT_NUM + 1))
        COMMIT_ORDER="$COMMIT_ORDER $feature"
        
        title=$(get_commit_title "$feature")
        file_count=$(wc -l < "$TEMP_DIR/$feature.files" | tr -d ' ')
        
        echo -e "${GREEN}$COMMIT_NUM.${NC} ${WHITE}$title${NC}"
        echo -e "   ${GRAY}$file_count files:${NC}"
        head -5 "$TEMP_DIR/$feature.files" | while read -r file; do
            echo -e "   ${GRAY}  - $file${NC}"
        done
        [ "$file_count" -gt 5 ] && echo -e "   ${GRAY}  ... and $((file_count - 5)) more${NC}"
        echo ""
    fi
done

if [ $COMMIT_NUM -eq 0 ]; then
    print_warning "No commits to create!"
    exit 0
fi

# ==================== STEP 4: CREATE COMMITS ====================
print_step "Step 4: Create Commits"

echo ""
echo -e "Ready to create ${GREEN}$COMMIT_NUM${NC} feature-specific commits."
echo ""
read -p "Proceed? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Aborted."
    exit 0
fi

# Clear staging area safely
# For existing repos: use git reset
# For fresh repos: nothing should be staged anyway (we don't stage in Step 2)
if git rev-parse HEAD >/dev/null 2>&1; then
    # Existing repo with commits - safe to use git reset
    git reset HEAD 2>/dev/null || true
fi
# For fresh repos (no HEAD), nothing to reset - staging area should be empty

echo ""
CURRENT=0
for feature in $COMMIT_ORDER; do
    [ -z "$feature" ] && continue
    CURRENT=$((CURRENT + 1))
    
    title=$(get_commit_title "$feature")
    body=$(get_commit_body "$feature")
    file_count=$(wc -l < "$TEMP_DIR/$feature.files" | tr -d ' ')
    
    print_info "[$CURRENT/$COMMIT_NUM] $title"
    
    # Stage ONLY this feature's files
    while read -r file; do
        git add "$file" 2>/dev/null || true
    done < "$TEMP_DIR/$feature.files"
    
    # Build file list for commit body
    file_list=$(head -10 "$TEMP_DIR/$feature.files" | sed 's/^/- /')
    [ "$file_count" -gt 10 ] && file_list="$file_list
- ... and $((file_count - 10)) more files"
    
    # Create commit with verbose message
    if git commit -m "$title
$body
Files changed ($file_count):
$file_list" 2>/dev/null; then
        print_success "Created: $title"
    else
        print_warning "Skipped (no changes)"
    fi
done

# ==================== STEP 5: SUMMARY ====================
print_step "Step 5: Summary"

echo ""
echo -e "${WHITE}Created commits:${NC}"
echo ""
git log --oneline -"$COMMIT_NUM" 2>/dev/null || git log --oneline -5 2>/dev/null
echo ""

# ==================== STEP 6: PUSH ====================
print_step "Step 6: Push to Remote"

echo ""
if [ -z "$GITHUB_REPO" ]; then
    print_warning "No remote configured — skipping push"
    print_info "Add a remote with: git remote add origin <url>"
    print_header "Done! 🎉"
    exit 0
fi

if [ "$WORKING_BRANCH" = "main" ]; then
    read -p "Push to origin/$WORKING_BRANCH? (y/n) " -n 1 -r
else
    echo -e "Push to feature branch: ${CYAN}origin/$WORKING_BRANCH${NC}"
    read -p "Proceed? (y/n) " -n 1 -r
fi
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if git push -u origin "$WORKING_BRANCH" 2>&1; then
        echo ""
        print_success "Pushed successfully!"
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ✅ Deployment Complete!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        # Show clickable links only for GitHub repos
        if echo "$GITHUB_REPO" | grep -q "github.com"; then
            echo -e "  View: ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/commits/${WORKING_BRANCH}${NC}"
            if [ "$WORKING_BRANCH" != "main" ]; then
                echo -e "  PR:   ${CYAN}https://github.com/${GITHUB_USER}/${REPO_NAME}/compare/main...${WORKING_BRANCH}${NC}"
            fi
        else
            echo -e "  Remote: ${CYAN}${GITHUB_REPO}${NC}"
        fi
        echo ""
    else
        print_warning "Push failed - trying force push..."
        read -p "Force push? (OVERWRITES REMOTE) (y/n) " -n 1 -r
        echo ""
        [[ $REPLY =~ ^[Yy]$ ]] && git push -u origin "$WORKING_BRANCH" --force && print_success "Force pushed!"
    fi
else
    print_info "Run when ready: git push -u origin $WORKING_BRANCH"
fi

print_header "Done! 🎉"
