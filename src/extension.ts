import * as vscode from "vscode";

// const Context = require("mdast-util-to-markdown").Context;
// const SafeOptions = require("mdast-util-to-markdown").SafeOptions;
const { unified } = require("unified");
const remarkParse = require("remark-parse").default;
const remarkStringify = require("remark-stringify").default;
const remarkDirective = require("remark-directive").default;
const remarkFrontmatter = require("remark-frontmatter").default;
const remarkGfm = require("remark-gfm").default;
const remarkMath = require("remark-math").default;
const stringWidth = require("string-width").default;

function replaceSoftBreaks(text: string): string {
  return text.replace(/([^\s])\n(?=[^\n])/g, "$1  \n");
}

function removeUnderscores(
  node: any,
  parent: any,
  context: any,
  safeOptions: any
) {
  // Garde les underscores mais échappe les autres caractères spéciaux si nécessaire
  let result = node.value;

  // Échappe sélectivement selon le contexte
  const parentType = parent?.type;
  const isInLink = parentType === "link" || parentType === "linkReference";

  if (!isInLink) {
    result = result.replace(/\[/g, "\\[").replace(/\]/g, "\\]"); // Crochets seulement hors liens
  }

  // Échappe les astérisques seulement s'ils pourraient être interprétés comme emphasis/strong
  result = result.replace(/(\*+)/g, (match: string) => {
    // Échappe seulement si c'est 1 ou 2 astérisques consécutifs (emphasis/strong)
    return match.length <= 2 ? "\\" + match : match;
  });

  // Échappe les backticks seulement s'ils ne sont pas déjà dans du code
  result = result.replace(/`/g, "\\`");

  return result;
}

async function formatWithRemark(markdown: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkFrontmatter)
    .use(remarkGfm, { stringLength: stringWidth })
    .use(remarkMath)
    .use(remarkStringify, {
      emphasis: "*",
      strong: "*",
      bullet: "-",
      fences: true,
      handlers: {
        break: () => "  \n",
        text: (node: any, parent: any, context: any, safeOptions: any) =>
          removeUnderscores(node, parent, context, safeOptions),
      },
    });

  return String(await processor.process(markdown));
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
