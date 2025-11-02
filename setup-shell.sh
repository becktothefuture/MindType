#!/bin/bash
# MindType Shell Setup Helper

PROJECT_ROOT="/Users/alexanderbeck/Coding Folder /MindType"
ZSH_CONFIG="$HOME/.zshrc"

echo "Setting up MindType shell shortcuts..."
echo ""

# Add alias to .zshrc if not already present
if ! grep -q "alias mt=" "$ZSH_CONFIG" 2>/dev/null; then
    echo "# MindType project shortcut" >> "$ZSH_CONFIG"
    echo "alias mt='cd \"$PROJECT_ROOT\"'" >> "$ZSH_CONFIG"
    echo "✅ Added 'mt' alias to ~/.zshrc"
else
    echo "⚠️  'mt' alias already exists in ~/.zshrc"
fi

# Add to current session
alias mt="cd \"$PROJECT_ROOT\""

echo ""
echo "✅ Setup complete!"
echo ""
echo "Usage:"
echo "  mt              # Go to MindType project root"
echo ""
echo "Reload your shell: source ~/.zshrc"
