// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

function replaceSoftBreaks(text: string): string {
  return text.replace(/([^\s])\n(?=[^\n])/g, "$1  \n");
}

async function formatWithRemark(markdown: string): Promise<string> {
  // Dynamically import the ECMAScript modules (same approach for desktop)
  const [
    { default: remarkStringify },
    { default: remarkDirective },
    { default: remarkFrontmatter },
    { default: remarkGfm },
    { default: remarkMath },
    { default: remarkParse },
    { unified }
  ] = await Promise.all([
    import("remark-stringify"),
    import("remark-directive"),
    import("remark-frontmatter"),
    import("remark-gfm"),
    import("remark-math"),
    import("remark-parse"),
    import("unified")
  ]);

  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkStringify, {
      // existing breaks will be replaced with hard breaks
      handlers: {
        break: () => "  \n",
      },
    });

  const file = await processor.process(markdown);

  return String(file);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "eloiblt" is now active in VS Code Desktop!');

	const formattingProvider: vscode.DocumentFormattingEditProvider = {
		async provideDocumentFormattingEdits(
			document: vscode.TextDocument
		): Promise<vscode.TextEdit[]> {
			const fullText = document.getText();

			const formatted = await formatWithRemark(fullText);
			const withHardBreaks = replaceSoftBreaks(formatted);

			const fullRange = new vscode.Range(
				document.positionAt(0),
				document.positionAt(fullText.length)
			);

			return [vscode.TextEdit.replace(fullRange, withHardBreaks)];
		},
	};

	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider(
			{ language: "markdown" },
			formattingProvider
		)
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
