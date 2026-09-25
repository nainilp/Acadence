param([switch]$Once)
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class AcadenceWindow {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int Size; public RECT Monitor,Work; public uint Flags; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr h, ref MONITORINFO info);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int max);
  public static bool Fullscreen() {
    var h=GetForegroundWindow(); var c=new System.Text.StringBuilder(256);GetClassName(h,c,256);
    if(c.ToString()=="Progman" || c.ToString()=="WorkerW") return false;
    RECT r; if(!GetWindowRect(h,out r))return false;
    var m=new MONITORINFO();m.Size=Marshal.SizeOf(m);GetMonitorInfo(MonitorFromWindow(h,2),ref m);
    return r.Left<=m.Monitor.Left && r.Top<=m.Monitor.Top && r.Right>=m.Monitor.Right && r.Bottom>=m.Monitor.Bottom;
  }
}
'@
[AcadenceWindow]::SetProcessDPIAware() | Out-Null
$previous = ''
while ($true) {
  $value = [AcadenceWindow]::Fullscreen().ToString()
  if ($value -ne $previous) { [Console]::WriteLine($value); $previous = $value }
  if ($Once) { break }
  Start-Sleep -Seconds 2
}
