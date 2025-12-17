import * as vscode from 'vscode';
import { VsCodeSCMAdapter } from './adapters/primary/VsCodeSCMAdapter';

export function activate(context: vscode.ExtensionContext) {
    console.log('Tentative d\'activation de l\'extension "commit-craft"...');

    try {
        // Initialisation de l'adaptateur SCM
        const scmAdapter = new VsCodeSCMAdapter(context);
        scmAdapter.initialize();
        console.log('Adaptateur SCM initialisé avec succès.');
        
        // Notification visible pour confirmer l'activation à l'utilisateur
        vscode.window.showInformationMessage('Commit Craft est actif ! Vérifiez l\'onglet Source Control (Ctrl+Shift+G).');

        // Enregistrement de la commande de génération (Bouton Generate)
        const generateDisposable = vscode.commands.registerCommand('commit-craft.generateMessage', () => {
            vscode.window.showInformationMessage('Génération du message de commit...');
            scmAdapter.setCommitMessage("feat: initial commit with hexagonal architecture");
        });
        
        // Enregistrement de la commande de commit
        const commitDisposable = vscode.commands.registerCommand('commit-craft.commit', () => {
            const message = scmAdapter.getCommitMessage();
            vscode.window.showInformationMessage(`Commit effectué avec le message : ${message}`);
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
