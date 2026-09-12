; Script generated for Genshin Abyss Studio
; Standalone Portable Windows Installer (.exe)

#define MyAppName "Genshin Abyss Studio"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Genshin Abyss Studio Creators"
#define MyAppURL "https://github.com/nzubechukwudavid/genshin-abyss-studio"
#define MyAppExeName "GenshinAbyssStudio.exe"

[Setup]
AppId={{D37E88A1-765B-4C91-B73F-9B64E2459D12}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\GenshinAbyssStudio
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=GenshinAbyssStudio-Setup
SetupIconFile=..\data\assets\app_icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\dist\GenshinAbyssStudio\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\data\assets\app_icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\data\assets\app_icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
