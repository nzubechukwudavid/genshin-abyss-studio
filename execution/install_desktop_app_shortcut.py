"""
Installs the unified Windows Desktop shortcut for Genshin Abyss Studio.
DOE-VERSION: 2026.09.12
"""
import sys
import subprocess
from pathlib import Path

desktop = Path.home() / "Desktop"
shortcut_path = desktop / "Genshin Abyss Studio.lnk"

pythonw_exe = Path(sys.executable).parent / "pythonw.exe"
if not pythonw_exe.exists():
    pythonw_exe = Path(sys.executable)

launcher_path = (Path(__file__).resolve().parent / "launch_studio_desktop.pyw").resolve()
cwd = Path(__file__).resolve().parent.parent
icon_path = (cwd / "data" / "assets" / "app_icon.ico").resolve()

icon_prop = f"$Shortcut.IconLocation = '{icon_path}'" if icon_path.exists() else ""

ps_script = f"""
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('{shortcut_path}')
$Shortcut.TargetPath = '{pythonw_exe}'
$Shortcut.Arguments = '"{launcher_path}"'
$Shortcut.WorkingDirectory = '{cwd}'
$Shortcut.Description = 'Genshin Abyss Studio - All-in-One Desktop Studio'
{icon_prop}
$Shortcut.Save()
"""

subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=True)
print(f"[+] Studio desktop shortcut created successfully at: {shortcut_path}")
