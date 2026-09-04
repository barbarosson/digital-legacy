export function isCommunityEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_COMMUNITY === "true";
}
