# Deploy Frontend a Hostinger
# Requiere WinSCP instalado: https://winscp.net/

$Host = "82.197.80.2"
$Port = 65002
$User = "u903977987"
$Password = "szRkBKBw3GPwt&3"
$LocalPath = ".\frontend\dist\*"
$RemotePath = "/public_html/"

Write-Host "Desplegando frontend a Hostinger..." -ForegroundColor Green

try {
    # Usando WinSCP
    & "C:\Program Files (x86)\WinSCP\WinSCP.com" `
        /log="deploy.log" `
        /command `
        "open sftp://${User}:${Password}@${Host}:${Port}/" `
        "cd $RemotePath" `
        "put $LocalPath" `
        "exit"

    Write-Host "✓ Deploy completado exitosamente!" -ForegroundColor Green
} catch {
    Write-Host "✗ Error durante el deploy: $_" -ForegroundColor Red
}
