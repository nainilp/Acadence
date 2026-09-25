param([switch]$Once)
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class AcadenceWindow {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int Size; public RECT Monitor,Work; public uint Flags; }
  public delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int index);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr h, ref MONITORINFO info);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int max);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int attribute, out int value, int size);
  public static bool IsFullscreen(IntPtr h) {
    if(!IsWindowVisible(h) || IsIconic(h) || (GetWindowLong(h,-20) & 0x80)!=0) return false;
    int cloaked; if(DwmGetWindowAttribute(h,14,out cloaked,4)==0 && cloaked!=0)return false;
    var c=new StringBuilder(256);GetClassName(h,c,256);
    if(c.ToString()=="Progman" || c.ToString()=="WorkerW" || c.ToString()=="Shell_TrayWnd") return false;
    RECT r;if(!GetWindowRect(h,out r))return false;
    var m=new MONITORINFO();m.Size=Marshal.SizeOf(m);if(!GetMonitorInfo(MonitorFromWindow(h,2),ref m))return false;
    return r.Left<=m.Monitor.Left+1 && r.Top<=m.Monitor.Top+1 && r.Right>=m.Monitor.Right-1 && r.Bottom>=m.Monitor.Bottom-1;
  }
  public static bool Fullscreen() {
    bool found=false;
    EnumWindows((h,p)=>{if(IsFullscreen(h)){found=true;return false;}return true;},IntPtr.Zero);
    return found;
  }
}
"@
[AcadenceWindow]::SetProcessDPIAware() | Out-Null
$previous = ''
while ($true) {
  $value = [AcadenceWindow]::Fullscreen().ToString()
  if ($value -ne $previous) { [Console]::WriteLine($value); $previous = $value }
  if ($Once) { break }
  Start-Sleep -Seconds 2
}
