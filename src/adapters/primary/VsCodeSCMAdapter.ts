import * as vscode from 'vscode';
import { SourceControlPort } from '../../ports/primary/SourceControlPort';
import { GitPort } from '../../ports/secondary/GitPort';

/**
 * Adaptateur pour l'API de Contrôle de Source de VS Code (SCM).
 * Cette classe permet d'afficher l'interface native de git dans VS Code.
 */
export class VsCodeSCMAdapter implements SourceControlPort {
    private scm: vscode.SourceControl;
    private changedGroup: vscode.SourceControlResourceGroup;
    private stagedGroup: vscode.SourceControlResourceGroup;

    constructor(
        context: vscode.ExtensionContext,
        private readonly _gitPort: GitPort
    ) {
        const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
        
        this.scm = vscode.scm.createSourceControl('commit-craft', 'Commit Craft', rootUri);
        this.stagedGroup = this.scm.createResourceGroup('staged', 'Staged Changes');
        this.changedGroup = this.scm.createResourceGroup('changes', 'Changes');
        
        // Configuration de l'interface SCM
        this.scm.inputBox.placeholder = "Message (Ctrl+Enter pour commiter)";
        
        // Ajout au contexte pour le nettoyage automatique
        context.subscriptions.push(this.scm);
    }

    /**
     * Initialise l'adaptateur et s'abonne aux changements git.
     */
    public initialize(): void {
        this._gitPort.onGitStatusChange(() => {
            this.refresh();
        });
        this.refresh();
    }

    /**
     * Rafraîchit les listes de fichiers dans l'interface SCM.
     */
    private async refresh(): Promise<void> {
        const stagedFiles = await this._gitPort.getStagedFiles();
        const unstagedFiles = await this._gitPort.getUnstagedFiles();

        this.updateGroup(this.stagedGroup, stagedFiles.map(f => f.path));
        this.updateGroup(this.changedGroup, unstagedFiles.map(f => f.path));
        
        this.scm.count = stagedFiles.length + unstagedFiles.length;
    }

    /**
     * Met à jour les ressources affichées dans un groupe spécifique.
     */
    private updateGroup(group: vscode.SourceControlResourceGroup, files: string[]): void {
        group.resourceStates = files.map(file => ({
            resourceUri: vscode.Uri.file(file),
            decorations: {
                tooltip: 'Modified',
                faded: false
            }
        }));
    }

    public updateResources(files: string[]): void {
        // Cette méthode est maintenant gérée en interne par refresh()
        this.refresh();
    }

    public getCommitMessage(): string {
        return this.scm.inputBox.value;
    }

    public setCommitMessage(message: string): void {
        this.scm.inputBox.value = message;
    }
}
