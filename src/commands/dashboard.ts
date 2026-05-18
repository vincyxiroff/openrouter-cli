import { startDashboard } from "../dashboard/dashboardServer.js";
import { printInfo, printMuted } from "../terminal/render.js";

export async function dashboardCommand(): Promise<void> {
  const server = await startDashboard(3000);
  printInfo(`Dashboard running at ${server.url}`);
  printMuted("Press Ctrl+C to stop.");
}
