"""
Installs the Windows Desktop and Taskbar shortcuts for Genshin Abyss Studio.
Configures pythonw.exe launcher, application working directory, and window icon.
"""
import sys
import subprocess
from pathlib import Path

desktop = Path.home() / "Desktop"
studio_shortcut = desktop / "Genshin Abyss Studio.lnk"
editor_shortcut = desktop / "Genshin Abyss Auto-Editor.lnk"

app_dir = Path(__file__).resolve().parent
pythonw_exe = Path(sys.executable).parent / "pythonw.exe"
if not pythonw_exe.exists():
    pythonw_exe = Path(sys.executable)

launcher_path = app_dir / "execution" / "launch_studio_desktop.pyw"
editor_path = app_dir / "execution" / "abyss_editor_gui.pyw"
icon_path = app_dir / "data" / "assets" / "app_icon.ico"

ps_script = f"""
$sh = New-Object -ComObject WScript.Shell

# 1. Desktop Studio Shortcut
$s1 = $sh.CreateShortcut('{studio_shortcut}')
$s1.TargetPath = '{pythonw_exe}'
$s1.Arguments = '"{launcher_path}"'
$s1.WorkingDirectory = '{app_dir}'
$s1.IconLocation = '{icon_path},0'
$s1.Description = 'Genshin Abyss Studio - All-in-One Creator Suite'
$s1.Save()

# 2. Desktop Auto-Editor Shortcut
$s2 = $sh.CreateShortcut('{editor_shortcut}')
$s2.TargetPath = '{pythonw_exe}'
$s2.Arguments = '"{editor_path}"'
$s2.WorkingDirectory = '{app_dir}'
$s2.IconLocation = '{icon_path},0'
$s2.Description = 'Genshin Abyss Auto-Editor GUI'
$s2.Save()

# 3. Taskbar Pinned Shortcut (if exists)
$taskbarLnk = "$env:APPDATA\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar\\Genshin Abyss Studio.lnk"
if (Test-Path $taskbarLnk) {{
    $s3 = $sh.CreateShortcut($taskbarLnk)
    $s3.TargetPath = '{pythonw_exe}'
    $s3.Arguments = '"{launcher_path}"'
    $s3.WorkingDirectory = '{app_dir}'
    $s3.IconLocation = '{icon_path},0'
    $s3.Description = 'Genshin Abyss Studio - All-in-One Creator Suite'
    $s3.Save()
}}

# 4. Notify Windows Shell
$code = @"
using System;
using System.Runtime.InteropServices;
public class ShellNotifier {{
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
}}
"@
Add-Type -TypeDefinition $code
[ShellNotifier]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
"""

subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=True)
print(f"[+] All shortcuts updated successfully with valid icons and paths.")
