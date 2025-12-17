import * as vscode from 'vscode';
import * as path from 'path';
import { SourceControlPort } from '../../ports/primary/SourceControlPort';

/**
 * Adaptateur pour l'API de Contrôle de Source de VS Code (SCM).
 * Cette classe permet d'afficher l'interface native de git dans VS Code.
 */
export class VsCodeSCMAdapter implements SourceControlPort {
    private scm: vscode.SourceControl;
    private changedGroup: vscode.SourceControlResourceGroup;

    constructor(context: vscode.ExtensionContext) {
        const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
        
        this.scm = vscode.scm.createSourceControl('commit-craft', 'Commit Craft', rootUri);
        this.changedGroup = this.scm.createResourceGroup('changes', 'Changes');
        
        // Configuration de l'interface SCM
        this.scm.inputBox.placeholder = "Message (Ctrl+Enter to commit)";
        
        // Ajout au contexte pour le nettoyage automatique
        context.subscriptions.push(this.scm);
    }

    /**
     * Initialise l'adaptateur et charge des données factices pour reproduire l'interface demandée.
     */
    public initialize(): void {
        // Simulation des fichiers de l'image pour la démo
        const mockFiles = [
            '.gitignore',
            'package-lock.json',
            'package.json',
            'pnpm-lock.yaml',
            'tsconfig.json',
            'extension.ts',
            'src/adapters/primary/.gitkeep',
            'src/adapters/secondary/.gitkeep',
            'src/application/.gitkeep',
            'src/domain/.gitkeep',
            'src/ports/primary/.gitkeep',
            'src/ports/secondary/.gitkeep'
        ];

        this.updateResources(mockFiles);
    }

    /**
     * Met à jour les ressources affichées dans le groupe "Changes".
     * @param files Liste des chemins relatifs des fichiers.
     */
    public updateResources(files: string[]): void {
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const resources = files.map(file => {
            const uri = vscode.Uri.file(path.join(rootPath, file));
            return {
                resourceUri: uri,
                decorations: {
                    tooltip: 'Untracked',
                    faded: false
                }
            } as vscode.SourceControlResourceState;
        });

        this.changedGroup.resourceStates = resources;
        // Le nombre "12" affiché à côté de Changes dans l'image
        this.scm.count = resources.length;
    }

    public getCommitMessage(): string {
        return this.scm.inputBox.value;
    }

    public setCommitMessage(message: string): void {
        this.scm.inputBox.value = message;
    }
}
