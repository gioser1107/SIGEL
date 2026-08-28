Set oWS = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
carpeta = fso.GetParentFolderName(WScript.ScriptFullName)
sLinkFile = oWS.SpecialFolders("Desktop") & "\SIGEL Travel BQTO.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = carpeta & "\iniciar.bat"
oLink.WorkingDirectory = carpeta
oLink.WindowStyle = 1
oLink.Description = "Iniciar SIGEL Travel BQTO"
oLink.Save
WScript.Echo "Acceso directo creado en el escritorio: SIGEL Travel BQTO"
