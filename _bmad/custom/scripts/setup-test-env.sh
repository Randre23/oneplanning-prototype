#!/bin/bash
# Setup benchmark test environment using reference BMAD project

set -e

PRINT_PATH=false
if [ "${1:-}" = "--print-path" ]; then
  PRINT_PATH=true
  exec 3>&1 1>&2
elif [ "$#" -ne 0 ]; then
  echo "Usage: $0 [--print-path]" >&2
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REFERENCE_BMAD="${BMAD_PROJECT:-${BMAD_PROJECT_PATH:-/Users/mmornati/Projects/bmadtest4}}"

echo -e "${GREEN}🔍 Checking BMAD reference project...${NC}"

# Verify reference BMAD exists
if [ ! -d "$REFERENCE_BMAD" ]; then
  echo -e "${RED}❌ Reference BMAD not found at: $REFERENCE_BMAD${NC}"
  echo -e "${YELLOW}📝 Expected a BMAD project at: $REFERENCE_BMAD${NC}"
  echo -e "${YELLOW}   Set BMAD_PROJECT to a reference project with .agents/skills and _bmad/scripts.${NC}"
  exit 1
fi

if [ ! -d "$REFERENCE_BMAD/.agents/skills" ]; then
  echo -e "${RED}❌ Skills not found in reference BMAD${NC}"
  exit 1
fi

if [ ! -f "$REFERENCE_BMAD/_bmad/scripts/resolve_customization.py" ]; then
  echo -e "${RED}❌ BMAD scripts not found in reference project${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Reference BMAD found at: $REFERENCE_BMAD${NC}"

# Create unique temp copy
TEST_DIR="/tmp/bmad-test-$(date +%s)-$$"
cleanup_test_dir_on_failure() {
  local status=$?
  if [ "$status" -ne 0 ]; then
    rm -rf "$TEST_DIR"
  fi
}
trap cleanup_test_dir_on_failure EXIT

mkdir -p "$TEST_DIR"

echo -e "${GREEN}📁 Creating test copy at: $TEST_DIR${NC}"

# Copy reference BMAD to temp location
cp -r "$REFERENCE_BMAD" "$TEST_DIR/bmad"
BMAD_COPY="$TEST_DIR/bmad"

echo -e "${GREEN}✅ Reference BMAD copied${NC}"

# Copy/update customization to _bmad/custom
echo -e "${GREEN}🔄 Applying customization to _bmad/custom...${NC}"
mkdir -p "$BMAD_COPY/_bmad/custom"
cp "$PROJECT_ROOT"/*.toml "$BMAD_COPY/_bmad/custom/"

echo -e "${GREEN}✅ Customization applied${NC}"

# Verify skill locations
echo -e "${GREEN}🧩 Verifying skills...${NC}"
SKILLS_FOUND=0
for skill in "decathlon-tech-radar" "decathlon-tech-compliance" "knowledge-graph-query" "spring-boot-fedid-resource-server" "better-auth-fedid-configuration-astro"; do
  if [ -f "$BMAD_COPY/.agents/skills/$skill/SKILL.md" ]; then
    SKILLS_FOUND=$((SKILLS_FOUND + 1))
    echo "  ✓ $skill"
  else
    echo "  ✗ $skill (not found)"
  fi
done

echo -e "${GREEN}✅ Found $SKILLS_FOUND/5 required skills${NC}"

# Export env vars for use by benchmark test
echo -e "${GREEN}📝 Setting up environment variables...${NC}"
# Shell-escape paths because this file is sourced by the benchmark runners.
{
  printf 'PROJECT_ROOT=%q\nTEST_DIR=%q\n' "$BMAD_COPY" "$TEST_DIR"
  for entry in \
    "ARCH_AGENT_SKILL_DIR:bmad-agent-architect" \
    "DEV_AGENT_SKILL_DIR:bmad-agent-dev" \
    "PM_AGENT_SKILL_DIR:bmad-agent-pm" \
    "UX_AGENT_SKILL_DIR:bmad-agent-ux-designer" \
    "PRD_WORKFLOW_SKILL_DIR:bmad-prd" \
    "ARCH_WORKFLOW_SKILL_DIR:bmad-architecture" \
    "EPICS_WORKFLOW_SKILL_DIR:bmad-create-epics-and-stories" \
    "SPRINT_WORKFLOW_SKILL_DIR:bmad-sprint-planning" \
    "CODE_REVIEW_WORKFLOW_SKILL_DIR:bmad-code-review" \
    "UX_WORKFLOW_SKILL_DIR:bmad-ux" \
    "BUILD_WORKFLOW_SKILL_DIR:bmad-build"; do
    printf '%s=%q\n' "${entry%%:*}" "$BMAD_COPY/.agents/skills/${entry#*:}"
  done
  for entry in \
    "TECH_RADAR_PATH:decathlon-tech-radar" \
    "TECH_COMPLIANCE_PATH:decathlon-tech-compliance" \
    "ASSET_KG_PATH:knowledge-graph-query" \
    "FEDID_SPRING_PATH:spring-boot-fedid-resource-server" \
    "FEDID_ASTRO_PATH:better-auth-fedid-configuration-astro"; do
    printf '%s=%q\n' "${entry%%:*}" "$BMAD_COPY/.agents/skills/${entry#*:}/SKILL.md"
  done
} > "$BMAD_COPY/.env.benchmark"

cat "$BMAD_COPY/.env.benchmark" | grep -v "^#" | grep "=" | while IFS='=' read -r key value; do
  echo "  $key=...$(basename "$value")"
done

# Save TEST_DIR for cleanup
echo "$BMAD_COPY" > "$BMAD_COPY/.test-marker"

echo -e "${GREEN}✅ Test environment ready${NC}"
echo -e "${YELLOW}📊 BMAD project: $BMAD_COPY${NC}"
echo -e "${YELLOW}💡 To clean up: rm -rf $TEST_DIR${NC}"

if [ "$PRINT_PATH" = true ]; then
  printf '%s\n' "$BMAD_COPY" >&3
fi
