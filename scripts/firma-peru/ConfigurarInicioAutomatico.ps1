[CmdletBinding()]
param(
    [switch]$Desactivar
)

$ErrorActionPreference = 'Stop'

$carpetaInicio = [Environment]::GetFolderPath('Startup')
$accesoInicio = Join-Path $carpetaInicio 'SIS Transferencia - Firma Peru.lnk'

if ($Desactivar) {
    if (Test-Path -LiteralPath $accesoInicio) {
        Remove-Item -LiteralPath $accesoInicio
    }
    Write-Output 'Inicio automatico de Firma Peru desactivado para este usuario.'
    return
}

$lanzador = Join-Path $env:WINDIR 'System32\rundll32.exe'
$clickOnce = Join-Path $env:WINDIR 'System32\dfshim.dll'
if (-not (Test-Path -LiteralPath $clickOnce)) {
    throw 'Se requiere ClickOnce de .NET Framework para iniciar Firma Peru.'
}

$urlCliente = 'https://resources.firmaperu.gob.pe/app/clickonce/clienteweb/FirmaPeruWeb.application?port=48596'
$shellWindows = New-Object -ComObject WScript.Shell
try {
    $acceso = $shellWindows.CreateShortcut($accesoInicio)
    $acceso.TargetPath = $lanzador
    $acceso.Arguments = '"' + $clickOnce + '",ShOpenVerbApplication ' + $urlCliente
    $acceso.WorkingDirectory = Split-Path -Path $lanzador
    $acceso.Description = 'Iniciar el cliente oficial de Firma Peru en el puerto 48596.'
    $acceso.WindowStyle = 7
    $acceso.Save()
} finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shellWindows)
}

Write-Output 'Inicio automatico de Firma Peru configurado para este usuario de Windows.'
Write-Output $accesoInicio
