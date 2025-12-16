---
description: Create backup of project excluding dependencies and unnecessary files
---

## Steps to create a backup folder and copy essential files

1. **Create backup directory inside the project**
   ```
   mkdir backup
   ```
   // turbo

2. **Copy project files while excluding heavy or unnecessary directories/files**
   ```
   robocopy . backup /E /XD node_modules .git .vscode /XF *.log *.tmp *.md
   ```
   // turbo

3. **Verify the backup size (optional)**
   ```
   du -sh backup
   ```
   // turbo

> You can later move the `backup` folder to a pendrive.
