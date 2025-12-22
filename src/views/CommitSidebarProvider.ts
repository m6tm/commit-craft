import * as vscode from 'vscode';

export class CommitSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'commit-craft.sidebarView';

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'generate':
                    vscode.commands.executeCommand('commit-craft.generateMessage');
                    break;
                case 'commit':
                    vscode.commands.executeCommand('commit-craft.commit');
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Commit Craft</title>
            <style>
                body {
                    padding: 0;
                    margin: 0;
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-sideBar-background);
                    font-size: 13px;
                    overflow-x: hidden;
                }
                .container {
                    display: flex;
                    flex-direction: column;
                }
                
                /* Zone de texte et boutons principaux */
                .input-section {
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .input-wrapper {
                    position: relative;
                }
                textarea {
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 6px 8px;
                    padding-right: 75px;
                    font-family: inherit;
                    resize: none;
                    min-height: 30px;
                    height: 30px;
                    width: 100%;
                    box-sizing: border-box;
                    border-radius: 2px;
                    outline: none;
                    overflow: hidden;
                }
                textarea:focus {
                    border-color: var(--vscode-focusBorder);
                }
                .generate-btn {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: var(--vscode-button-background);
                    border: none;
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    font-size: 11px;
                    padding: 3px 8px;
                    border-radius: 2px;
                }
                .generate-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .commit-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    width: 100%;
                    height: 28px;
                    font-weight: 400;
                }
                .commit-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                /* Section Changes - Design VS Code */
                .changes-section {
                    margin-top: 4px;
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    padding: 2px 4px;
                    cursor: pointer;
                    background-color: var(--vscode-sideBar-background);
                    height: 22px;
                }
                .section-header:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .chevron {
                    width: 16px;
                    height: 16px;
                    margin-right: 2px;
                    fill: currentColor;
                }
                .section-title {
                    font-weight: bold;
                    font-size: 11px;
                    text-transform: uppercase;
                    flex-grow: 1;
                }
                .badge {
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    border-radius: 10px;
                    padding: 0 6px;
                    font-size: 11px;
                    height: 16px;
                    line-height: 16px;
                    min-width: 8px;
                    text-align: center;
                    margin-right: 4px;
                }

                /* Liste des fichiers */
                .file-list {
                    display: flex;
                    flex-direction: column;
                }
                .file-item {
                    display: flex;
                    align-items: center;
                    padding: 0 8px 0 20px;
                    height: 22px;
                    cursor: pointer;
                    position: relative;
                }
                .file-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .file-icon {
                    width: 16px;
                    height: 16px;
                    margin-right: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .file-label {
                    display: flex;
                    align-items: baseline;
                    flex-grow: 1;
                    overflow: hidden;
                    white-space: nowrap;
                }
                .file-name {
                    color: var(--vscode-foreground);
                }
                .file-path {
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.9em;
                    margin-left: 6px;
                    opacity: 0.7;
                }
                
                /* Actions au survol */
                .file-actions {
                    display: none;
                    gap: 2px;
                    margin-right: 8px;
                }
                .file-item:hover .file-actions {
                    display: flex;
                }
                .action-icon {
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 3px;
                    color: var(--vscode-foreground);
                }
                .action-icon:hover {
                    background-color: var(--vscode-toolbar-hoverBackground);
                }
                .action-icon svg {
                    width: 14px;
                    height: 14px;
                    fill: currentColor;
                }

                /* Actions globales au survol de l'en-tête section */
                .header-actions {
                    display: none;
                    gap: 2px;
                    margin-right: 4px;
                }
                .section-header:hover .header-actions {
                    display: flex;
                }

                /* Indicateur de statut (M, U, D) */
                .status-icon {
                    font-weight: bold;
                    font-size: 11px;
                    width: 12px;
                    text-align: center;
                }
                .status-m { color: var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d); }
                .status-u { color: var(--vscode-gitDecoration-untrackedResourceForeground, #73c991); }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="input-section">
                    <div class="input-wrapper">
                        <textarea id="commit-message" placeholder="Message (Ctrl+Enter pour commiter)"></textarea>
                        <button class="generate-btn" onclick="post('generate')" title="Générer le message">Générer</button>
                    </div>
                    <button class="commit-btn" onclick="post('commit')">Commit</button>
                </div>

                <div class="changes-section">
                    <div class="section-header">
                        <svg class="chevron" viewBox="0 0 16 16"><path d="M7.976 10.072l4.357-4.357.62.618L8.285 11l-.618-.618L3.31 6.025l.619-.618 4.047 4.665z"/></svg>
                        <span class="section-title">Staged Changes</span>
                        <div class="header-actions">
                            <div class="action-icon" title="Unstager toutes les modifications">
                                <svg viewBox="0 0 16 16"><path d="M13 7H3v2h10V7z"/></svg>
                            </div>
                        </div>
                        <span class="badge">1</span>
                    </div>

                    <div class="file-list">
                        <div class="file-item">
                            <div class="file-icon">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="#e37933"><path d="M14.7 13.14l-1.1-9.98c-.03-.3-.12-.55-.38-.7l-5-3.03c-.2-.12-.46-.17-.7-.12s-.45.16-.58.35L3.1 5.37c-.17.26-.23.56-.2.86l1.1 9.98c.03.3.12.55.38.7l5 3.03c.2.12.46.17.7.12s.45-.16.58-.35l3.86-5.71c.17-.26.23-.56.2-.86zM8.44 1.7 l3.83 2.32-2.9 4.3h-1.3l.37-5.55q.02-.33.22-.52t.54-.19l.71.01-.2-.41L8.44 1.7z"/></svg>
                            </div>
                            <div class="file-label">
                                <span class="file-name">package.json</span>
                                <span class="file-path">.</span>
                            </div>
                            <div class="file-actions">
                                <div class="action-icon" title="Ouvrir le fichier">
                                    <svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8z"/></svg>
                                </div>
                                <div class="action-icon" title="Unstager le fichier">
                                    <svg viewBox="0 0 16 16"><path d="M13 7H3v2h10V7z"/></svg>
                                </div>
                            </div>
                            <span class="status-icon status-m">M</span>
                         </div>
                    </div>
                </div>

                <div class="changes-section">
                    <div class="section-header">
                        <svg class="chevron" viewBox="0 0 16 16"><path d="M7.976 10.072l4.357-4.357.62.618L8.285 11l-.618-.618L3.31 6.025l.619-.618 4.047 4.665z"/></svg>
                        <span class="section-title">Changes</span>
                        <div class="header-actions">
                            <div class="action-icon" title="Ouvrir toutes les modifications">
                                <svg viewBox="0 0 16 16"><path d="M5 5h6v1H5V5zm0 2h6v1H5V7zm0 2h4v1H5V9z"/><path d="M13.5 1h-11l-.5.5v13l.5.5h11l.5-.5v-13l-.5-.5zM13 14H3V2h10v12z"/></svg>
                            </div>
                            <div class="action-icon" title="Annuler toutes les modifications">
                                <svg viewBox="0 0 16 16"><path d="M10.3 6.74l-.7.71L8 5.86l-1.6 1.6-.7-.71L7.29 5.15 5.69 3.55l.7-.71L8 4.44l1.6-1.6.7.71-1.59 1.6 1.59 1.59zM8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zm0 13a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/></svg>
                            </div>
                            <div class="action-icon" title="Stager toutes les modifications">
                                <svg viewBox="0 0 16 16"><path d="M14 7H9V2H7v5H2v2h5v5h2V9h5z"/></svg>
                            </div>
                        </div>
                        <span class="badge">1</span>
                    </div>

                    <div class="file-list">
                        <div class="file-item">
                            <div class="file-icon">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="#519aba"><path d="M14.7 13.14l-1.1-9.98c-.03-.3-.12-.55-.38-.7l-5-3.03c-.2-.12-.46-.17-.7-.12s-.45.16-.58.35L3.1 5.37c-.17.26-.23.56-.2.86l1.1 9.98c.03.3.12.55.38.7l5 3.03c.2.12.46.17.7.12s.45-.16.58-.35l3.86-5.71c.17-.26.23-.56.2-.86zM8.44 1.7 l3.83 2.32-2.9 4.3h-1.3l.37-5.55q.02-.33.22-.52t.54-.19l.71.01-.2-.41L8.44 1.7z"/></svg>
                            </div>
                            <div class="file-label">
                                <span class="file-name">CommitSidebarProvider.ts</span>
                                <span class="file-path">src/views</span>
                            </div>
                            <div class="file-actions">
                                <div class="action-icon" title="Ouvrir le fichier">
                                    <svg viewBox="0 0 16 16"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8z"/></svg>
                                </div>
                                <div class="action-icon" title="Annuler les modifications">
                                    <svg viewBox="0 0 16 16"><path d="M10.3 6.74l-.7.71L8 5.86l-1.6 1.6-.7-.71L7.29 5.15 5.69 3.55l.7-.71L8 4.44l1.6-1.6.7.71-1.59 1.6 1.59 1.59zM8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zm0 13a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/></svg>
                                </div>
                                <div class="action-icon" title="Stager le fichier">
                                    <svg viewBox="0 0 16 16"><path d="M14 7H9V2H7v5H2v2h5v5h2V9h5z"/></svg>
                                </div>
                            </div>
                            <span class="status-icon status-m">M</span>
                         </div>
                    </div>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                
                const textarea = document.getElementById('commit-message');
                textarea.addEventListener('input', function() {
                    this.style.height = '30px';
                    this.style.height = (this.scrollHeight) + 'px';
                });

                function post(type) {
                    vscode.postMessage({ type: type });
                }
            </script>
        </body>
        </html>`;
    }
}
