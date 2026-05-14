$ErrorActionPreference = "Stop"

$compiler = Join-Path $PSScriptRoot "..\tools\tectonic\tectonic.exe"

if (-not (Test-Path $compiler)) {
    throw "Tectonic compiler not found at $compiler"
}

Push-Location $PSScriptRoot
try {
    & $compiler main.tex
}
finally {
    Pop-Location
}
