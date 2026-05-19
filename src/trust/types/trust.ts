export type TrustLevel = "trusted-project" | "trusted-folder" | "restricted";

export type TrustDatabase = {
  trustedProjects: string[];
  trustedFolders: string[];
};

export type TrustState = {
  level: TrustLevel;
  cwd: string;
  projectRoot: string;
  trustedPath?: string;
};

export type TrustChoice = "project" | "folder" | "restricted" | "cancel";
