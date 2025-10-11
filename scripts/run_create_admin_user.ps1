<#
run_create_admin_user.ps1

Usage examples:
  # Interactive (prompts for password if missing)
  .\scripts\run_create_admin_user.ps1 -DbHost localhost -DbPort 5432 -DbUser postgres -DbName "faculty-reporting-system1" -Username admin -Email admin31@gmail.com

  # Non-interactive (pass password via parameter)
  .\scripts\run_create_admin_user.ps1 -DbHost localhost -DbPort 5432 -DbUser postgres -DbPassword 'YourNewStrongPassword!' -DbName "faculty-reporting-system1" -Username admin -Email admin31@gmail.com -Password 'Your$tr0ngP@ss'

Notes:
 - This script sets environment variables in the current PowerShell session and runs the Node script.
 - It does NOT persist secrets to disk. After the Node script runs, you can choose to clear the environment variables.
 - If you prefer using a single DATABASE_URL, provide -DatabaseUrl instead of DB_* params.
#>
param(
  [string]$DatabaseUrl,
  [string]$DbHost = 'localhost',
  [int]$DbPort = 5432,
  [string]$DbUser = 'postgres',
  [SecureString]$DbPassword,
  [string]$DbName = 'faculty-reporting-system1',
  [string]$Username = 'admin',
  [string]$Email = 'admin@example.com',
  [SecureString]$Password
)

# Read a secret from console as SecureString (approved verb)
function Read-SecureString([string]$prompt) {
  Write-Host -NoNewline "$($prompt): "
  return Read-Host -AsSecureString
}

# Convert SecureString to plain text only when absolutely necessary
function ConvertFrom-SecureStringPlain([SecureString]$sec) {
  if (-not $sec) { return $null }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

# If DatabaseUrl supplied, use it; otherwise set DB_* vars
if ($DatabaseUrl) {
  $env:DATABASE_URL = $DatabaseUrl
} else {
  $env:DB_HOST = $DbHost
  $env:DB_PORT = [string]$DbPort
  $env:DB_USER = $DbUser
  if (-not $DbPassword) {
    $DbPassword = Read-SecureString "Enter DB password for user '$DbUser'"
  }
  $env:DB_PASSWORD = ConvertFrom-SecureStringPlain $DbPassword
  $env:DB_NAME = $DbName
}

# Node environment
$env:NODE_ENV = 'development'
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = 'replace_with_a_long_random_string' }

# Prompt for admin password if not supplied
if (-not $Password) {
  $Password = Read-SecureString "Enter password for admin user '$Username'"
}

# Build the args for the Node script
$nodeArgs = @()
$nodeArgs += '.\scripts\create_admin_user.js'
$nodeArgs += '--username'; $nodeArgs += $Username
$nodeArgs += '--email'; $nodeArgs += $Email
$nodeArgs += '--password'; $nodeArgs += (ConvertFrom-SecureStringPlain $Password)

Write-Host "Running create_admin_user.js with user='$Username' email='$Email' against host='$DbHost' db='$DbName'"

# Run the node script
$nodeCmd = "node " + ($nodeArgs -join ' ')
Write-Host "Executing: $nodeCmd"

$proc = Start-Process -FilePath 'node' -ArgumentList $nodeArgs -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -eq 0) {
  Write-Host "create_admin_user.js completed successfully (exit code 0)."
} else {
  Write-Host "create_admin_user.js exited with code $($proc.ExitCode)." -ForegroundColor Yellow
}

# Optionally clear sensitive env vars
# Uncomment the following lines if you want the script to clear DB credentials from the session automatically
# Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
# Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
# Remove-Item Env:JWT_SECRET -ErrorAction SilentlyContinue

Write-Host "Done. If the script succeeded, verify with: node server.js then visit http://localhost:5003/api/db-test"
