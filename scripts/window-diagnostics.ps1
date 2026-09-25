. "$PSScriptRoot\..\electron\fullscreen.ps1" -Once
[AcadenceWindow]::EnumWindows([AcadenceWindow+EnumWindowsProc]{
 param($window,$parameter)
 if([AcadenceWindow]::IsFullscreen($window)){
  $className=New-Object System.Text.StringBuilder 256
  [AcadenceWindow]::GetClassName($window,$className,256) | Out-Null
  $rect=New-Object AcadenceWindow+RECT
  [AcadenceWindow]::GetWindowRect($window,[ref]$rect) | Out-Null
  Write-Host "Fullscreen handle=$window class=$className bounds=$($rect.Left),$($rect.Top),$($rect.Right),$($rect.Bottom)"
 }
 return $true
},[IntPtr]::Zero) | Out-Null
