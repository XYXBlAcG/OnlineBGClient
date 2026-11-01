export function phonePreviewEnabled(search: string, embedded: boolean) {
  return (
    embedded && new URLSearchParams(search).get("device-preview") === "phone"
  );
}
