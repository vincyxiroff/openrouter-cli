export type TeamConfig = {
  enabled: false;
  endpoint?: string | undefined;
  organization?: string | undefined;
};

export const defaultTeamConfig: TeamConfig = {
  enabled: false
};
