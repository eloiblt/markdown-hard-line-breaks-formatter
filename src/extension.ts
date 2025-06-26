import * as vscode from 'vscode';

function replaceSoftBreaks(text: string): string {
  return text.replace(/([^\s])\n(?=[^\n])/g, "$1  \n");
}

async function formatWithRemark(markdown: string): Promise<string> {
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
      handlers: {
        break: () => "  \n",
      },
    });

  const file = await processor.process(markdown);

  return String(file);
}

export function activate(context: vscode.ExtensionContext) {
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

export function deactivate() {}
