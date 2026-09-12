"""
Installs the Windows Desktop shortcut for Genshin Abyss Auto-Editor.
"""
import sys
import subprocess
from pathlib import Path

desktop = Path.home() / "Desktop"
shortcut_path = desktop / "Genshin Abyss Auto-Editor.lnk"

pythonw_exe = Path(sys.executable).parent / "pythonw.exe"
if not pythonw_exe.exists():
    pythonw_exe = Path(sys.executable)

gui_path = (Path(__file__).resolve().parent / "abyss_editor_gui.pyw").resolve()
cwd = Path(__file__).resolve().parent.parent

ps_script = f"""
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('{shortcut_path}')
$Shortcut.TargetPath = '{pythonw_exe}'
$Shortcut.Arguments = '"{gui_path}"'
$Shortcut.WorkingDirectory = '{cwd}'
$Shortcut.Description = '1-Click Genshin Abyss Video Auto-Editor'
$Shortcut.Save()
"""

subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=True)
print(f"[+] Shortcut created successfully at: {shortcut_path}")
