# Pull Request Merge Instructions
## refactor/pdf-alignment-v0.6

### 🔗 Step 1: Create PR
Open: https://github.com/becktothefuture/MindType/pull/new/refactor/pdf-alignment-v0.6

### 📝 Step 2: Review Changes
- Check "Files changed" tab
- Verify ~177 files moved to DELETE/
- Confirm new docs and web-lab-v0.6 added

### ✅ Step 3: Merge
Click "Merge pull request" → "Confirm merge"

### 🧹 Step 4: Post-Merge Cleanup
```bash
# Navigate to main repo
cd "/Users/alexanderbeck/Coding Folder /MindType"

# Update local v0.6 branch
git checkout v0.6
git pull origin v0.6

# Install dependencies
pnpm install

# Run tests
pnpm test

# Remove obsolete files (after tests pass)
rm -rf DELETE

# Clean up worktree
git worktree remove /Users/alexanderbeck/.cursor/worktrees/MindType__Workspace_/edCWX

# Delete merged branch
git branch -d refactor/pdf-alignment-v0.6
git push origin --delete refactor/pdf-alignment-v0.6
```

### 🔍 Step 5: Verify
```bash
# Check old files removed
ls -la | grep -E "_development|tapestry"

# Check new docs exist
ls docs/00-index/

# Build project
pnpm build
```

### 🧪 Step 6: Test Web Lab (Optional)
```bash
cd web-lab-v0.6
pnpm install
pnpm dev
# Open http://localhost:5173
```

---
*Saved: November 1, 2025*
