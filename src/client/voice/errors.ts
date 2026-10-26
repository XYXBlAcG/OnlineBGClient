export function voiceError(error: unknown): string {
  if (error instanceof Error) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    )
      return "麦克风权限被拒绝，请在系统隐私设置中允许 OnlineBGClient 使用麦克风；仍可静音收听。";
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError")
      return "没有找到麦克风，请连接设备后刷新列表。";
    if (error.name === "NotReadableError")
      return "麦克风暂时不可用，请检查设备连接及其他应用的占用。";
    if (error.name === "OverconstrainedError")
      return "所选音频设备已不可用，请重新选择设备。";
    return error.message;
  }
  return String(error);
}
