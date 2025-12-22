import * as vscode from 'vscode';
import { VsCodeSCMAdapter } from './adapters/primary/VsCodeSCMAdapter';
import { VsCodeGitAdapter } from './adapters/secondary/VsCodeGitAdapter';
import { OpenAiAdapter } from './adapters/secondary/OpenAiAdapter';
import { GenerateCommitMessageUseCase } from './application/use-cases/GenerateCommitMessageUseCase';
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
        const aiAdapter = new OpenAiAdapter();
        const scmAdapter = new VsCodeSCMAdapter(context, gitAdapter);
        scmAdapter.initialize();
        console.log('Adaptateurs SCM, Git et IA initialisés avec succès.');
        
        // Initialisation des use cases
        const generateCommitMessageUseCase = new GenerateCommitMessageUseCase(gitAdapter, aiAdapter);

        // Enregistrement de la vue latérale personnalisée
        const sidebarProvider = new CommitSidebarProvider(context.extensionUri, gitAdapter);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(CommitSidebarProvider.viewType, sidebarProvider)
        );

        // Enregistrement de la commande de génération (Bouton Generate)
        const generateDisposable = vscode.commands.registerCommand('commit-craft.generateMessage', async () => {
            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Génération du message de commit via l'IA...",
                    cancellable: false
                }, async () => {
                    const message = await generateCommitMessageUseCase.execute();
                    scmAdapter.setCommitMessage(message);
                    sidebarProvider.setCommitMessage(message);
                });
            } catch (error: any) {
                vscode.window.showErrorMessage(`Erreur: ${error.message}`);
            }
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
