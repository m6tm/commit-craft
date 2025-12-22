import * as vscode from 'vscode';
import { GitPort, GitFile } from '../../ports/secondary/GitPort';

/**
 * Adaptateur pour l'API Git intégrée de VS Code.
 */
export class VsCodeGitAdapter implements GitPort {
    private gitApi: any;
    private listeners: (() => void)[] = [];

    constructor() {
        this.initializeGitApi();
    }

    private initializeGitApi() {
        try {
            const extension = vscode.extensions.getExtension('vscode.git');
            if (extension) {
                if (extension.isActive) {
                    this.gitApi = extension.exports.getAPI(1);
                    this.setupRepoListeners();
                } else {
                    extension.activate().then(() => {
                        this.gitApi = extension.exports.getAPI(1);
                        this.setupRepoListeners();
                    });
                }
            }
        } catch (error) {
            console.error('[CommitCraft] Erreur lors de l\'accès à Git:', error);
        }
    }

    private setupRepoListeners() {
        if (!this.gitApi) return;

        this.gitApi.onDidOpenRepository((repo: any) => {
            this.observeRepository(repo);
            this.notifyListeners();
        });

        if (this.gitApi.repositories.length > 0) {
            this.gitApi.repositories.forEach((repo: any) => {
                this.observeRepository(repo);
            });
        }
    }

    private observeRepository(repo: any) {
        repo.state.onDidChange(() => this.notifyListeners());
    }

    private notifyListeners() {
        this.listeners.forEach(callback => callback());
    }

    public async getStagedFiles(): Promise<GitFile[]> {
        if (!this.gitApi) return [];
        
        const allStaged: GitFile[] = [];
        for (const repo of this.gitApi.repositories) {
            const staged = repo.state.indexChanges.map((change: any) => ({
                path: change.uri.fsPath,
                status: this.mapStatus(change.status)
            }));
            allStaged.push(...staged);
        }
        return allStaged;
    }

    public async getUnstagedFiles(): Promise<GitFile[]> {
        if (!this.gitApi) return [];

        const allUnstaged: GitFile[] = [];
        for (const repo of this.gitApi.repositories) {
            const unstaged = repo.state.workingTreeChanges.map((change: any) => ({
                path: change.uri.fsPath,
                status: this.mapStatus(change.status)
            }));
            allUnstaged.push(...unstaged);
        }
        return allUnstaged;
    }

    public onGitStatusChange(callback: () => void): void {
        this.listeners.push(callback);
        if (this.gitApi) {
            this.gitApi.repositories.forEach((repo: any) => this.observeRepository(repo));
        }
    }

    public async stageFile(uriString: string): Promise<void> {
        try {
            const uri = vscode.Uri.parse(uriString);
            // Utiliser les commandes natives de VS Code est plus robuste
            await vscode.commands.executeCommand('git.stage', uri);
        } catch (err) {
            console.error('[CommitCraft] Erreur stage:', err);
        }
    }

    public async unstageFile(uriString: string): Promise<void> {
        try {
            const uri = vscode.Uri.parse(uriString);
            await vscode.commands.executeCommand('git.unstage', uri);
        } catch (err) {
            console.error('[CommitCraft] Erreur unstage:', err);
        }
    }

    public async discardChanges(uriString: string): Promise<void> {
        try {
            const uri = vscode.Uri.parse(uriString);
            
            // Pour le discard, on doit être plus précis car git.clean 
            // et git.revert se comportent différemment
            const extension = vscode.extensions.getExtension('vscode.git');
            if (extension) {
                const api = extension.exports.getAPI(1);
                const repo = api.getRepository(uri);
                if (repo) {
                    const isUntracked = repo.state.workingTreeChanges.some((c: any) => 
                        c.uri.toString() === uriString && c.status === 7
                    );
                    
                    if (isUntracked) {
                        await vscode.commands.executeCommand('git.clean', uri);
                    } else {
                        await vscode.commands.executeCommand('git.revert', uri);
                    }
                }
            }
        } catch (err) {
            console.error('[CommitCraft] Erreur discard:', err);
        }
    }

    public async commit(message: string): Promise<void> {
        try {
            if (!message || message.trim() === '') {
                vscode.window.showWarningMessage('Veuillez saisir un message de commit.');
                return;
            }
            await vscode.commands.executeCommand('git.commit', { message });
        } catch (err) {
            console.error('[CommitCraft] Erreur commit:', err);
        }
    }

    public async stageAll(): Promise<void> {
        try {
            await vscode.commands.executeCommand('git.stageAll');
        } catch (err) {
            console.error('[CommitCraft] Erreur stageAll:', err);
        }
    }

    public async unstageAll(): Promise<void> {
        try {
            await vscode.commands.executeCommand('git.unstageAll');
        } catch (err) {
            console.error('[CommitCraft] Erreur unstageAll:', err);
        }
    }

    public async discardAll(): Promise<void> {
        try {
            // git.cleanAll ou git.revertAll selon le contexte? 
            // En général git.cleanAll gère les deux ou on peut utiliser git.discardAll (si existante)
            await vscode.commands.executeCommand('git.cleanAll');
        } catch (err) {
            console.error('[CommitCraft] Erreur discardAll:', err);
        }
    }

    private mapStatus(status: number): GitFile['status'] {
        switch (status) {
            case 0: return 'modified';
            case 1: return 'added';
            case 2: return 'deleted';
            case 3: return 'renamed';
            case 5: return 'modified';
            case 6: return 'deleted';
            case 7: return 'untracked';
            case 8: return 'ignored';
            default: return 'modified';
        }
    }

    public getRelativePath(absolutePath: string): string {
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (rootPath && absolutePath.startsWith(rootPath)) {
            let relative = absolutePath.substring(rootPath.length);
            if (relative.startsWith('\\') || relative.startsWith('/')) {
                relative = relative.substring(1);
            }
            return relative;
        }
        return absolutePath;
    }
}
