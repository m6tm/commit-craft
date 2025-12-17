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
        // Use VS Code's built-in CSS variables for styling to match the theme
        return `<!DOCTYPE html>
        <html lang="en">
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
                }
                .container {
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                /* Input Area Styling */
                .input-wrapper {
                    position: relative;
                    margin-bottom: 2px;
                }
                .input-group {
                    position: relative;
                    min-height: 30px;
                }
                textarea {
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    padding: 6px 8px;
                    padding-right: 80px; /* Space for the button */
                    font-family: inherit;
                    resize: none;
                    min-height: 30px;
                    height: 30px;
                    width: 100%;
                    box-sizing: border-box;
                    border-radius: 4px;
                    outline: none;
                    overflow: hidden;
                    white-space: pre-wrap;
                }
                textarea:focus {
                    border-color: var(--vscode-focusBorder);
                }
                textarea::placeholder {
                    color: var(--vscode-input-placeholderForeground);
                }

                /* Generate Button inside Input */
                .generate-btn {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    background: var(--vscode-button-background);
                    border: none;
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 3px;
                }
                .generate-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                /* Main Commit Button */
                .commit-btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    width: 100%;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-weight: 500;
                }
                .commit-btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                /* Tree View Styling (Changes) */
                .section-header {
                    display: flex;
                    align-items: center;
                    padding: 4px 0;
                    cursor: pointer;
                    user-select: none;
                    font-weight: bold;
                    color: var(--vscode-sideBarTitle-foreground);
                    text-transform: uppercase;
                    font-size: 11px;
                }
                .section-header:hover {
                    color: var(--vscode-foreground);
                }
                .section-icon {
                    margin-right: 4px;
                    display: flex;
                    align-items: center;
                }
                .codicon-chevron-down {
                    width: 16px;
                    height: 16px;
                    fill: currentColor;
                }

                .file-list {
                    display: flex;
                    flex-direction: column;
                }
                .file-item {
                    display: flex;
                    align-items: center;
                    padding: 3px 10px;
                    cursor: pointer;
                    color: var(--vscode-gitDecoration-modifiedResourceForeground);
                    margin-left: 0;
                }
                .file-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .file-item.untracked {
                    color: var(--vscode-gitDecoration-untrackedResourceForeground);
                }
                .file-icon {
                    margin-right: 6px;
                    font-weight: bold;
                    width: 14px;
                    text-align: center;
                    font-size: 13px;
                }
                .file-details {
                    display: flex;
                    align-items: baseline;
                    overflow: hidden;
                }
                .file-name {
                    white-space: nowrap;
                    color: var(--vscode-foreground);
                }
                .file-path {
                    opacity: 0.6; 
                    font-size: 0.9em; 
                    margin-left: 6px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .badge-count {
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    border-radius: 10px;
                    padding: 1px 6px;
                    font-size: 10px;
                    margin-left: auto;
                }
                
                /* SVG Icons */
                .icon-sparkle {
                    width: 14px;
                    height: 14px;
                    fill: currentColor;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="input-wrapper">
                    <div class="input-group">
                        <textarea id="commit-message" placeholder="Message (Ctrl+Enter to commit)"></textarea>
                        <button class="generate-btn" onclick="post('generate')" title="Generate Commit Message">
                            <span>Generate</span>
                        </button>
                    </div>
                    <button class="commit-btn" id="commit-btn" onclick="post('commit')">
                        Commit Now
                    </button>
                </div>

                <div class="file-list">
                    <div class="section-header">
                        <div class="section-icon">
                            <svg class="codicon-chevron-down" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L8 9.79289L12.1464 5.64645C12.3417 5.45118 12.6583 5.45118 12.8536 5.64645C13.0488 5.84171 13.0488 6.15829 12.8536 6.35355L8.35355 10.8536C8.15829 11.0488 7.84171 11.0488 7.64645 10.8536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z"/>
                            </svg>
                        </div>
                        <span>Changes</span>
                        <span class="badge-count">3</span>
                        <div style="flex:1"></div>
                        <!-- Optional action icons could go here -->
                    </div>
                    
                    <div class="file-item">
                        <span class="file-icon">M</span>
                        <div class="file-details">
                            <span class="file-name">extension.ts</span>
                            <span class="file-path">src</span>
                        </div>
                    </div>
                    <div class="file-item untracked">
                         <span class="file-icon">U</span>
                        <div class="file-details">
                            <span class="file-name">icon.svg</span>
                            <span class="file-path">resources</span>
                        </div>
                    </div>
                    <div class="file-item">
                        <span class="file-icon">M</span>
                        <div class="file-details">
                            <span class="file-name">package.json</span>
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
