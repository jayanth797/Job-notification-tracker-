#!/bin/bash
# Initialize Git and Push to Remote

# 1. Initialize if not already
if [ ! -d ".git" ]; then
  git init
  echo "Initialized empty Git repository"
fi

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial commit: KodNest Premium Build System" || echo "Nothing to commit"

# 4. Rename branch to main
git branch -M main

# 5. Add remote (remove if exists to avoid error)
if git remote | grep -q "origin"; then
  git remote remove origin
fi
git remote add origin https://github.com/jayanth797/Job-notification-tracker-.git

# 6. Push
git push -u origin main
