import * as vscode from 'vscode';
import { VsCodeSCMAdapter } from './adapters/primary/VsCodeSCMAdapter';
import { VsCodeGitAdapter } from './adapters/secondary/VsCodeGitAdapter';
import { CommitSidebarProvider } from './views/CommitSidebarProvider';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Tentative d\'activation de l\'extension "commit-craft"...');

    try {
        // S'assurer que l'extension Git est active
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (gitExtension && !gitExtension.isActive) {
            await gitExtension.activate();
        }

        // Initialisation des adaptateurs
        const gitAdapter = new VsCodeGitAdapter();
        const scmAdapter = new VsCodeSCMAdapter(context, gitAdapter);
        scmAdapter.initialize();
        console.log('Adaptateurs SCM et Git initialisés avec succès.');
        
        // Notification visible pour confirmer l'activation à l'utilisateur
        vscode.window.showInformationMessage('Commit Craft est actif ! Vérifiez l\'onglet Source Control (Ctrl+Shift+G).');

        // Enregistrement de la vue latérale personnalisée
        const sidebarProvider = new CommitSidebarProvider(context.extensionUri, gitAdapter);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(CommitSidebarProvider.viewType, sidebarProvider)
        );

        // Enregistrement de la commande de génération (Bouton Generate)
        const generateDisposable = vscode.commands.registerCommand('commit-craft.generateMessage', () => {
            vscode.window.showInformationMessage('Génération du message de commit...');
            scmAdapter.setCommitMessage("feat: initial commit with hexagonal architecture");
        });
        
        // Enregistrement de la commande de commit
        const commitDisposable = vscode.commands.registerCommand('commit-craft.commit', async () => {
            const message = scmAdapter.getCommitMessage();
            await gitAdapter.commit(message);
        });

        // Commande helloWorld par défaut (gardée pour référence)
        let disposable = vscode.commands.registerCommand('commit-craft.helloWorld', () => {
            vscode.window.showInformationMessage('Hello World from Commit Craft!');
        });

        context.subscriptions.push(generateDisposable, commitDisposable, disposable);
        console.log('L\'extension "commit-craft" est maintenant pleinement active !');
    } catch (error) {
        console.error('Erreur lors de l\'activation de l\'extension "commit-craft":', error);
        vscode.window.showErrorMessage('Erreur critique lors du chargement de Commit Craft.');
    }
}

export function deactivate() {}
