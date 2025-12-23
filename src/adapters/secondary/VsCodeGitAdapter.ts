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

    public async getAllDiffs(staged: boolean): Promise<string> {
        try {
            if (!this.gitApi) return '';

            let allDiffs = '';
            for (const repo of this.gitApi.repositories) {
                const diff = await repo.diff(staged);
                if (diff) {
                    allDiffs += `--- Dépôt: ${repo.rootUri.fsPath} ---\n${diff}\n\n`;
                }
            }
            return allDiffs;
        } catch (err) {
            console.error('[CommitCraft] Erreur getAllDiffs:', err);
            return '';
        }
    }

    public async stageFile(path: string): Promise<void> {
        console.log('[CommitCraft] Command: git.stage', path);
        try {
            await vscode.commands.executeCommand('git.stage', vscode.Uri.file(path));
        } catch (err) {
            console.error('[CommitCraft] Erreur stage command:', err);
        }
    }

    public async unstageFile(path: string): Promise<void> {
        console.log('[CommitCraft] Command: git.unstage', path);
        try {
            await vscode.commands.executeCommand('git.unstage', vscode.Uri.file(path));
        } catch (err) {
            console.error('[CommitCraft] Erreur unstage command:', err);
        }
    }

    /**
     * Annule les modifications d'un fichier (commande native VS Code).
     */
    public async discardChanges(path: string): Promise<void> {
        console.log('[CommitCraft] Discard changes for:', path);
        try {
            const uri = vscode.Uri.file(path);
            
            if (this.gitApi) {
                // On cherche l'objet de changement natif dans tous les repos
                for (const repo of this.gitApi.repositories) {
                    const change = repo.state.workingTreeChanges.find((c: any) => 
                        c.uri.fsPath.toLowerCase() === uri.fsPath.toLowerCase()
                    );
                    
                    if (change) {
                        // Passer l'objet natif est la méthode la plus robuste
                        await vscode.commands.executeCommand('git.clean', change);
                        return;
                    }
                }
            }

            // Fallback: si on ne trouve pas l'objet natif, on passe un objet mimant l'état
            await vscode.commands.executeCommand('git.clean', { resourceUri: uri });
        } catch (err: any) {
            console.error('[CommitCraft] Erreur discard:', err);
            vscode.window.showErrorMessage(`Erreur lors de l'annulation : ${err.message || err}`);
        }
    }

    public async commit(message: string): Promise<void> {
        try {
            if (!message || message.trim() === '') {
                vscode.window.showWarningMessage('Veuillez saisir un message de commit.');
                return;
            }

            if (!this.gitApi || this.gitApi.repositories.length === 0) {
                vscode.window.showErrorMessage("Aucun dépôt Git détecté.");
                return;
            }

            let committed = false;
            for (const repo of this.gitApi.repositories) {
                // On effectue le commit uniquement s'il y a des changements indexés
                if (repo.state.indexChanges.length > 0) {
                    await repo.commit(message);
                    committed = true;
                }
            }

            if (!committed) {
                vscode.window.showWarningMessage("Aucun changement indexé (staged) à valider.");
            } else {
                vscode.window.setStatusBarMessage('Commit effectué avec succès !', 5000);
            }
        } catch (err: any) {
            console.error('[CommitCraft] Erreur commit:', err);
            vscode.window.showErrorMessage(`Erreur lors du commit : ${err.message}`);
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

    /**
     * Annule toutes les modifications non indexées.
     */
    public async discardAll(): Promise<void> {
        try {
            await vscode.commands.executeCommand('git.cleanAll');
        } catch (err: any) {
            console.error('[CommitCraft] Erreur discardAll:', err);
            vscode.window.showErrorMessage(`Erreur lors de l'annulation globale : ${err.message || err}`);
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
