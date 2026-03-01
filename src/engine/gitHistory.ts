import { simpleGit, SimpleGit } from "simple-git";

export class GitEngine {
  private git: SimpleGit;

  constructor(workspacePath: string) {
    this.git = simpleGit(workspacePath);
  }

  async getFileHistory(filePath: string, limit: number = 5) {
    try {
      const log = await this.git.log({ file: filePath });
      const commits = log.all.slice(0, limit);
      const history = [];
      for (const commit of commits) {
        const diff = await this.git.show([commit.hash, "--", filePath]);
        history.push({
          hash: commit.hash,
          date: commit.date,
          message: commit.message,
          author_name: commit.author_name,
          diff: diff,
        });
      }
      return history;
    } catch (error) {
      console.warn(`Could not get git history for ${filePath}`, error);
      return [];
    }
  }

  async isGitRepo(): Promise<boolean> {
    return this.git.checkIsRepo();
  }
}
